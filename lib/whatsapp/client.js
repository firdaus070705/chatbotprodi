/**
 * WhatsApp Client (Baileys - with MySQL logging)
 * ================================================
 * Menggunakan library Baileys (aktif & stabil)
 * QR code ditampilkan di dashboard via API
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const QRCode = require('qrcode');
const db = require('../../database/connection');
const path = require('path');
const fs = require('fs');

class WhatsAppClient {
  constructor(nlpEngine, config = {}) {
    this.nlpEngine = nlpEngine;
    this.config = config;
    this.client = null; // socket baileys
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
    this.authFolder = path.join(process.cwd(), '.wwebjs_auth', config.sessionName || 'chatbot-session');
  }

  async initialize() {
    console.log('📱 Menginisialisasi WhatsApp Client (Baileys)...');
    await this._startSocket();
  }

  async _startSocket() {
    // Pastikan folder auth ada
    if (!fs.existsSync(this.authFolder)) {
      fs.mkdirSync(this.authFolder, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

    let version;
    try {
      const result = await fetchLatestBaileysVersion();
      version = result.version;
      console.log(`📌 Menggunakan WA versi: ${version.join('.')}`);
    } catch (e) {
      version = [2, 2413, 51]; // fallback
      console.log(`📌 Menggunakan WA versi fallback: ${version.join('.')}`);
    }

    const sock = makeWASocket({
      version,
      auth: state,
      browser: ['Chatbot Skripsi', 'Chrome', '10.0'],
      generateHighQualityLinkPreview: false,
      logger: require('pino')({ level: 'silent' }),
    });

    this.client = sock;

    // =========================================================================
    // 👇👇👇 [SKRIPSI] KODE UNTUK MEMBUAT BARCODE WA ADA DI SINI 👇👇👇
    // =========================================================================
    // Simpan credentials setiap update
    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates (QR, connected, disconnected)
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // QR Code tersedia
      if (qr) {
        console.log('\n📲 QR Code tersedia! Scan di dashboard atau terminal:\n');
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
      }

      // Koneksi berhasil terbuka
      if (connection === 'open') {
        this.isReady = true;
        this.qrCodeData = null; // Hapus QR setelah connected
        this.stats.startTime = new Date().toISOString();
        console.log('✅ WhatsApp Client siap! (Baileys)');

        // Update status di database
        try {
          await db.query(
            `INSERT INTO bot_sessions (session_name, status, started_at) VALUES (?, 'online', NOW())`,
            [this.config.sessionName || 'chatbot-session']
          );
        } catch (e) { /* ignore if db not ready */ }

        if (this.onReadyCallback) this.onReadyCallback();
      }

      // Koneksi tertutup
      if (connection === 'close') {
        this.isReady = false;
        this.qrCodeData = null;

        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log('⚠️ WhatsApp terputus. Status:', statusCode);

        if (shouldReconnect) {
          console.log('🔄 Mencoba reconnect...');
          setTimeout(() => this._startSocket(), 3000);
        } else {
          console.log('🚪 Logged out. Menghapus session untuk QR baru...');
          // Hapus session agar bisa scan QR baru
          try {
            if (fs.existsSync(this.authFolder)) {
              fs.rmSync(this.authFolder, { recursive: true, force: true });
            }
          } catch (err) {
            console.log('⚠️ Gagal hapus session:', err.message);
          }
          // Restart untuk QR baru
          setTimeout(() => this._startSocket(), 3000);
        }
      }
    });

    // =========================================================================
    // 👇👇👇 [SKRIPSI] KODE UNTUK MENERIMA DAN MEMPROSES PESAN 👇👇👇
    // =========================================================================
    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const message of messages) {
        await this._handleMessage(message);
      }
    });
  }

  async _handleMessage(message) {
    try {
      // Abaikan pesan dari diri sendiri
      if (message.key.fromMe) return;
      // Abaikan pesan dari status/broadcast
      const from = message.key.remoteJid;
      if (!from || from === 'status@broadcast' || from.includes('@broadcast')) return;
      // Abaikan pesan grup
      if (from.includes('@g.us')) return;

      // Ambil teks pesan
      const messageText = message.message?.conversation
        || message.message?.extendedTextMessage?.text
        || '';
      if (!messageText || messageText.trim() === '') return;

      console.log(`\n📩 Pesan dari ${from}: "${messageText}"`);

      // Proses dengan NLP
      const result = this.nlpEngine.processMessage(messageText);
      console.log(`🧠 Intent: ${result.intent} (confidence: ${result.confidence})`);
      console.log(`💬 Respons: ${JSON.stringify(result.response)}`);
      if (result.image) {
        console.log(`🖼️ Gambar: ${result.image}`);
      }
      if (result.document) {
        console.log(`📄 Dokumen: ${result.document}`);
      }

      // Kirim respons (dengan gambar atau dokumen jika ada)
      if (result.document) {
        try {
          // Cek dokumen di root folder atau folder media
          let docPath = path.join(process.cwd(), result.document);
          if (!fs.existsSync(docPath)) docPath = path.join(process.cwd(), 'media', result.document);

          if (fs.existsSync(docPath)) {
            await this.client.sendMessage(from, {
              document: fs.readFileSync(docPath),
              fileName: path.basename(docPath),
              mimetype: 'application/pdf',
              caption: result.response
            });
            console.log('✅ Dokumen berhasil dikirim!');
          } else {
            console.log(`⚠️ File dokumen tidak ditemukan: ${docPath}`);
            await this.client.sendMessage(from, { text: result.response });
          }
        } catch (docError) {
          console.error('❌ Error mengirim dokumen:', docError.message);
          await this.client.sendMessage(from, { text: result.response });
        }
      } else if (result.image) {
        try {
          const imagePath = path.join(process.cwd(), 'media', result.image);
          if (fs.existsSync(imagePath)) {
            // Kirim gambar dengan caption
            await this.client.sendMessage(from, {
              image: fs.readFileSync(imagePath),
              caption: result.response,
              mimetype: 'image/jpeg'
            });
            console.log('✅ Gambar berhasil dikirim!');
          } else {
            console.log(`⚠️ File gambar tidak ditemukan: ${imagePath}`);
            // Fallback: kirim teks saja
            await this.client.sendMessage(from, { text: result.response });
          }
        } catch (imgError) {
          console.error('❌ Error mengirim gambar:', imgError.message);
          // Fallback: kirim teks saja
          await this.client.sendMessage(from, { text: result.response });
        }
      } else {
        // Kirim teks biasa
        await this.client.sendMessage(from, { text: result.response });
      }

      // Update stats
      this.stats.messagesReceived++;
      this.stats.messagesSent++;
      this.stats.lastMessageTime = new Date().toISOString();

      const logEntry = {
        timestamp: new Date().toISOString(),
        from: from,
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
