/**
 * WhatsApp Client (with MySQL logging)
 * ======================================
 * Menggunakan nomor WhatsApp biasa (scan QR code)
 * QR code ditampilkan di dashboard via API
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const db = require('../../database/connection');

class WhatsAppClient {
  constructor(nlpEngine, config = {}) {
    this.nlpEngine = nlpEngine;
    this.config = config;
    this.client = null;
    this.isReady = false;
    this.qrCodeData = null; // QR code sebagai data URL untuk dashboard
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      startTime: null,
      lastMessageTime: null
    };
    this.logs = []; // In-memory cache (backup jika MySQL mati)
    this.maxLogs = config.maxLogs || 1000;
    this.onReadyCallback = null;
    this.onMessageCallback = null;
    this.onQRCallback = null;
    this.useDatabase = true;
  }

  initialize() {
    console.log('📱 Menginisialisasi WhatsApp Client...');

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: this.config.sessionName || 'chatbot-session'
      }),
      qrMaxRetries: 9,
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });

    this._setupEventHandlers();
    this.client.initialize();
  }

  _setupEventHandlers() {
    // =========================================================================
    // 👇👇👇 [SKRIPSI] KODE UNTUK MEMBUAT BARCODE WA ADA DI SINI 👇👇👇
    // =========================================================================
    // QR Code — tampilkan di terminal DAN simpan untuk dashboard
    this.client.on('qr', async (qr) => {
      console.log('\n📲 QR Code tersedia! Scan di dashboard atau terminal:\n');
      qrcode.generate(qr, { small: true });

      // Generate QR code sebagai data URL untuk dashboard
      try {
        this.qrCodeData = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });
        console.log('🌐 QR Code juga tersedia di dashboard\n');
      } catch (err) {
        console.error('Error generating QR data URL:', err);
      }

      if (this.onQRCallback) this.onQRCallback(qr);
    });

    this.client.on('authenticated', () => {
      console.log('🔐 Autentikasi berhasil!');
      this.qrCodeData = null; // Hapus QR setelah authenticated
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Autentikasi gagal:', msg);
      // Hapus data sesi jika gagal auten karena rusak
      const fs = require('fs');
      const sessionPath = '.wwebjs_auth/session-' + (this.config.sessionName || 'chatbot-session');
      try {
         if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
         console.log('🧹 Session direstore karena autentikasi gagal. Menunggu barcode baru...');
      } catch (err) {}
    });

    this.client.on('ready', async () => {
      this.isReady = true;
      this.stats.startTime = new Date().toISOString();
      this.qrCodeData = null; // Hapus QR setelah ready
      console.log('✅ WhatsApp Client siap!');

      // Update status di database
      try {
        await db.query(
          `INSERT INTO bot_sessions (session_name, status, started_at) VALUES (?, 'online', NOW())`,
          [this.config.sessionName || 'chatbot-session']
        );
      } catch (e) { /* ignore if db not ready */ }

      if (this.onReadyCallback) this.onReadyCallback();
    });

    this.client.on('message', async (message) => {
      await this._handleMessage(message);
    });

    this.client.on('disconnected', (reason) => {
      this.isReady = false;
      this.qrCodeData = null; // Reset QR yang lama
      console.log('⚠️ WhatsApp terputus:', reason);
      
      // ✨ FIX: Auto-Restart client dengan membuat instance baru
      // agar event handler dan QR code bisa muncul kembali
      console.log('🔄 Mencoba memuat ulang WhatsApp Client...');
      setTimeout(async () => {
        // 1. Destroy client lama terlebih dahulu
        try {
          await this.client.destroy();
          console.log('🧹 Client lama berhasil di-destroy.');
        } catch (e) {
          console.log('⚠️ Destroy client gagal (mungkin sudah tertutup):', e.message);
        }

        // 2. Hapus sesi lama SETELAH destroy (agar file tidak terkunci oleh Puppeteer)
        const fs = require('fs');
        const sessionPath = '.wwebjs_auth/session-' + (this.config.sessionName || 'chatbot-session');
        try {
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log('🧹 Session dibersihkan agar QR Code baru bisa muncul.');
          }
        } catch (err) {
          console.log('⚠️ Gagal hapus session folder:', err.message);
        }

        // 3. Buat client BARU dan pasang event handler ulang
        try {
          this.client = new Client({
            authStrategy: new LocalAuth({
              clientId: this.config.sessionName || 'chatbot-session'
            }),
            qrMaxRetries: 9,
            puppeteer: {
              headless: true,
              args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
              ]
            }
          });

          this._setupEventHandlers(); // Pasang event handler QR, ready, dll ke client baru
          this.client.initialize();
          console.log('✅ Client baru berhasil dibuat dan sedang inisialisasi (menunggu QR baru)...');
        } catch (err) {
          console.error('❌ Gagal restart client:', err.message);
        }
      }, 5000); // Tunggu 5 detik agar Puppeteer sempat release semua file lock
    });
  }

  async _handleMessage(message) {
    try {
      // Abaikan pesan dari status/story broadcast
      if (message.from === 'status@broadcast' || message.from.includes('@broadcast')) return;
      // Abaikan pesan grup
      if (message.from.includes('@g.us')) return;
      // Abaikan pesan dari diri sendiri
      if (message.fromMe) return;
      // Hanya proses pesan teks biasa
      if (message.type !== 'chat') return;

      const messageText = message.body;
      if (!messageText || messageText.trim() === '') return;

      console.log(`\n📩 Pesan dari ${message.from}: "${messageText}"`);

      // Proses dengan NLP
      const result = this.nlpEngine.processMessage(messageText);
      console.log(`🧠 Intent: ${result.intent} (confidence: ${result.confidence})`);
      console.log(`💬 Respons: ${JSON.stringify(result.response)}`);

      // Kirim respons
      await message.reply(result.response);

      // Update stats
      this.stats.messagesReceived++;
      this.stats.messagesSent++;
      this.stats.lastMessageTime = new Date().toISOString();

      const logEntry = {
        timestamp: new Date().toISOString(),
        from: message.from,
        message: messageText,
        intent: result.intent,
        confidence: result.confidence,
        response: result.response,
        isDefaultResponse: result.isDefaultResponse,
        entities: result.entities,
        processingTime: result.processingTime
      };

      // Simpan ke in-memory cache
      this.logs.unshift(logEntry);
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(0, this.maxLogs);
      }

      // Simpan ke MySQL
      if (this.useDatabase) {
        try {
          await db.saveConversationLog(logEntry);
        } catch (err) {
          console.error('⚠️ Gagal simpan ke MySQL:', err.message);
        }
      }

      if (this.onMessageCallback) this.onMessageCallback(result);

    } catch (error) {
      console.error('❌ Error memproses pesan:', error.message);
    }
  }

  getStatus() {
    return {
      isReady: this.isReady,
      hasQR: !!this.qrCodeData,
      stats: this.stats,
      uptime: this.stats.startTime
        ? Math.floor((Date.now() - new Date(this.stats.startTime).getTime()) / 1000)
        : 0
    };
  }

  getQRCode() {
    return this.qrCodeData;
  }

  getLogs(limit = 50) {
    return this.logs.slice(0, limit);
  }

  onReady(cb) { this.onReadyCallback = cb; }
  onMessage(cb) { this.onMessageCallback = cb; }
  onQR(cb) { this.onQRCallback = cb; }
}

module.exports = WhatsAppClient;
