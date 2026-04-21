/**
 * Express Dashboard Server (with QR Code & MySQL)
 * ================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('../database/connection');
const multer = require('multer');
const fs = require('fs');

class DashboardServer {
  constructor(waClient, nlpEngine, config = {}) {
    this.waClient = waClient;
    this.nlpEngine = nlpEngine;
    this.config = config;
    this.app = express();
    this.server = null;
    this._setupRoutes();
  }

  _setupRoutes() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));

    // =========================================================================
    // 👇👇👇 [SKRIPSI] KODE UNTUK AUTENTIKASI ADMIN DASHBOARD 👇👇👇
    // =========================================================================
    // Setup Token Store untuk Login di memori server
    this.validTokens = new Set();
    const crypto = require('crypto');

    // API: Login Endpoint
    this.app.post('/api/login', (req, res) => {
      const { username, password } = req.body;
      const adminConfig = this.config.admin || { username: 'admin', password: 'password123' };
      
      if (username === adminConfig.username && password === adminConfig.password) {
        const token = crypto.randomBytes(32).toString('hex');
        this.validTokens.add(token);
        return res.json({ success: true, token: token });
      }
      return res.status(401).json({ success: false, message: 'Username atau Password salah!' });
    });

    // API: Logout Endpoint
    this.app.post('/api/logout', (req, res) => {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        this.validTokens.delete(token);
      }
      res.json({ success: true, message: 'Logout berhasil' });
    });

    // Middleware Autentikasi API
    this.app.use('/api', (req, res, next) => {
      // Pengecualian: Jalur login dan logout boleh diakses tanpa token
      if (req.path === '/login' || req.path === '/logout') return next();

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Harap login terlebih dahulu!' });
      }

      const token = authHeader.split(' ')[1];
      if (!this.validTokens.has(token)) {
        return res.status(401).json({ error: 'Unauthorized: Sesi kadaluarsa. Silakan login kembali.' });
      }

      next();
    });

    // Setup Multer untuk upload Kalender Akademik
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', 'media');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        // Selalu timpa (overwrite) file kalender_akademik.jpg
        cb(null, 'kalender_akademik.jpg');
      }
    });
    const upload = multer({ 
      storage: storage,
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Hanya file gambar yang diperbolehkan!'));
      }
    });

    // API: Upload Gambar Kalender Akademik
    this.app.post('/api/upload-kalender', upload.single('kalenderImage'), (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'Tidak ada gambar yang diunggah' });
        }
        res.json({ success: true, message: 'Gambar Kalender Akademik berhasil diperbarui!' });
      } catch (err) {
        console.error('❌ POST /api/upload-kalender error:', err.message);
        res.status(500).json({ error: err.message });
      }
    });

    // =========================================================================
    // 👇👇👇 [SKRIPSI] API JEMBATAN UNTUK MENGIRIM QR CODE KE WEB 👇👇👇
    // =========================================================================
    // API: QR Code untuk scan di dashboard
    this.app.get('/api/qr', (req, res) => {
      const qr = this.waClient.getQRCode();
      const status = this.waClient.getStatus();

      if (status.isReady) {
        res.json({ status: 'connected', qr: null, message: 'WhatsApp sudah terhubung!' });
      } else if (qr) {
        res.json({ status: 'waiting_scan', qr: qr, message: 'Scan QR code dengan WhatsApp' });
      } else {
        res.json({ status: 'initializing', qr: null, message: 'Menginisialisasi WhatsApp...' });
      }
    });

    // API: Putuskan koneksi WhatsApp (agar QR code muncul kembali)
    this.app.post('/api/disconnect', async (req, res) => {
      try {
        if (this.waClient.client) {
          await this.waClient.client.logout();
          res.json({ success: true, message: 'WhatsApp berhasil diputuskan. QR Code baru akan muncul.' });
        } else {
          res.json({ success: false, message: 'Client belum diinisialisasi.' });
        }
      } catch (err) {
        console.error('❌ POST /api/disconnect error:', err.message);
        try {
          this.waClient.isReady = false;
          this.waClient.qrCodeData = null;
          if (this.waClient.client) this.waClient.client.end(new Error('Force disconnect'));
        } catch (e) {}
        res.json({ success: true, message: 'WhatsApp diputuskan paksa. Restart server untuk QR baru.' });
      }
    });

    // =========================================================================
    // 👇👇👇 [SKRIPSI] API INTEGRASI WORDPRESS (PUSH NOTIFIKASI) 👇👇👇
    // =========================================================================
    // API: Mengirim pesan dari aplikasi eksternal (Contoh: Notifikasi WordPress)
    this.app.post('/api/send-message', async (req, res) => {
      try {
        const { number, message, apiKey } = req.body;
        
        // Mengamankan API agar tidak disalahgunakan orang luar
        const SECRET_WP_KEY = 'KUNCI-RAHASIA-SKRIPSI-123'; 

        if (apiKey !== SECRET_WP_KEY) {
           return res.status(401).json({ error: 'Unauthorized: API Key salah atau tidak ada' });
        }
        if (!number || !message) {
           return res.status(400).json({ error: 'Parameter "number" dan "message" wajib diisi' });
        }
        
        // Parsing nomor HP: ubah 08xxx menjadi format WhatsApp 628xxx@c.us
        let formattedNumber = number.replace(/\D/g, ''); // Hapus karakter non-angka
        if (formattedNumber.startsWith('0')) {
            formattedNumber = '62' + formattedNumber.slice(1);
        }
        formattedNumber = formattedNumber + '@c.us';

        if (this.waClient && this.waClient.isReady) {
          // Kirim pesan lewat engine whatsapp-web.js
          await this.waClient.client.sendMessage(formattedNumber, message);
          res.json({ success: true, message: 'Berhasil: Pesan terkirim dari sistem WordPress!' });
        } else {
          res.status(503).json({ error: 'Gagal: Chatbot sedang offline/belum scan QR' });
        }
      } catch (err) {
        console.error('❌ POST /api/send-message error:', err.message);
        res.status(500).json({ error: 'Gagal mengirim pesan: ' + err.message });
      }
    });

    // =========================================================================
    // 👇👇👇 [SKRIPSI] BAGIAN INI ADALAH KODE UNTUK MENGIRIM STATUS APLIKASI KE WEB 👇👇👇
    // =========================================================================
    // API: Status
    this.app.get('/api/status', (req, res) => {
      const waStatus = this.waClient.getStatus();
      const nlpStats = this.nlpEngine.getStats();
      res.json({
        whatsapp: waStatus,
        nlp: nlpStats,
        serverTime: new Date().toISOString()
      });
    });

    // =========================================================================
    // 👇👇👇 [SKRIPSI] BAGIAN INI ADALAH KODE UNTUK MENGAMBIL DATA STATISTIK DARI DATABASE 👇👇👇
    // =========================================================================
    // API: Statistik (dari MySQL)
    this.app.get('/api/stats', async (req, res) => {
      try {
        const dbStats = await db.getStats();
        const status = this.waClient.getStatus();

        res.json({
          totalMessages: dbStats.totalMessages || status.stats.messagesReceived,
          totalResponses: status.stats.messagesSent,
          averageConfidence: dbStats.averageConfidence,
          defaultResponseRate: dbStats.totalMessages > 0
            ? Math.round((dbStats.defaultResponses / dbStats.totalMessages) * 100)
            : 0,
          intentDistribution: dbStats.intentDistribution,
          uptime: status.uptime,
          startTime: status.stats.startTime
        });
      } catch (err) {
        // Fallback ke in-memory jika MySQL error
        const logs = this.waClient.getLogs(1000);
        const status = this.waClient.getStatus();
        const intentDist = {};
        let totalConfidence = 0;
        let defaultCount = 0;
        logs.forEach(l => {
          intentDist[l.intent] = (intentDist[l.intent] || 0) + 1;
          totalConfidence += (l.confidence || 0);
          if (l.isDefaultResponse) defaultCount++;
        });
        const avgConf = logs.length > 0 ? Math.round((totalConfidence / logs.length) * 1000) / 1000 : 0;
        const defRate = logs.length > 0 ? Math.round((defaultCount / logs.length) * 100) : 0;
        res.json({
          totalMessages: status.stats.messagesReceived,
          totalResponses: status.stats.messagesSent,
          averageConfidence: avgConf,
          defaultResponseRate: defRate,
          intentDistribution: intentDist,
          uptime: status.uptime,
          startTime: status.stats.startTime
        });
      }
    });

    // =========================================================================
    // 👇👇👇 [SKRIPSI] BAGIAN INI ADALAH KODE UNTUK MENAMPILKAN RIWAYAT CHAT DI DASHBOARD 👇👇👇
    // =========================================================================
    // API: Log (dari MySQL)
    this.app.get('/api/logs', async (req, res) => {
      const limit = parseInt(req.query.limit) || 50;
      try {
        const logs = await db.getConversationLogs(limit);
        res.json({ logs, total: logs.length, source: 'mysql' });
      } catch (err) {
        // Fallback ke in-memory
        const logs = this.waClient.getLogs(limit);
        res.json({ logs, total: logs.length, source: 'memory' });
      }
    });

    // =========================================================================
    // 👇👇👇 [SKRIPSI] BAGIAN INI ADALAH KODE UNTUK FITUR UJICOBA CHATBOT DI TAMPILAN WEB 👇👇👇
    // =========================================================================
    // API: Test NLP
    this.app.post('/api/test', async (req, res) => {
      try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Parameter "message" diperlukan' });
        
        if (!this.nlpEngine || !this.nlpEngine.ready) {
          return res.status(503).json({ error: 'NLP Engine belum siap. Coba beberapa saat lagi.' });
        }
        
        const result = this.nlpEngine.processMessage(message);

        // --- Simpan Log Test ke Statistik Dashboard ---
        const logEntry = {
          timestamp: new Date().toISOString(),
          from: 'Test Tool (Dashboard)',
          message: message,
          intent: result.intent,
          confidence: result.confidence,
          response: result.response,
          isDefaultResponse: result.isDefaultResponse,
          entities: result.entities,
          processingTime: result.processingTime
        };

        if (this.waClient) {
          this.waClient.stats.messagesReceived++;
          this.waClient.stats.messagesSent++;
          this.waClient.stats.lastMessageTime = new Date().toISOString();

          if (this.waClient.logs) {
            this.waClient.logs.unshift(logEntry);
            if (this.waClient.logs.length > this.waClient.maxLogs) {
              this.waClient.logs = this.waClient.logs.slice(0, this.waClient.maxLogs);
            }
          }
          
          if (this.waClient.useDatabase) {
            try {
              await db.saveConversationLog(logEntry);
            } catch (ignoreErr) {}
          }
        }
        // ---------------------------------------------
        
        res.json(result);
      } catch (err) {
        console.error('❌ POST /api/test error:', err);
        res.status(500).json({ error: 'Gagal memproses pesan: ' + err.message });
      }
    });

    // API: Database status
    this.app.get('/api/db-status', async (req, res) => {
      const connected = await db.testConnection();
      res.json({ connected, database: 'MySQL' });
    });

    // =========================================================================
    // 👇👇👇 [SKRIPSI] BAGIAN INI ADALAH KODE UNTUK MELIHAT DAFTAR PENGGUNA BOT 👇👇👇
    // =========================================================================
    // API: Daftar pengguna chatbot
    this.app.get('/api/users', async (req, res) => {
      try {
        const users = await db.getUsers();
        res.json({ users, total: users.length });
      } catch (err) {
        const logs = this.waClient.getLogs(1000);
        const userMap = {};
        logs.forEach(l => {
          const s = l.from || 'unknown';
          if (!userMap[s]) userMap[s] = { sender: s, total_messages: 0, last_message: l.timestamp };
          userMap[s].total_messages++;
        });
        res.json({ users: Object.values(userMap), total: Object.keys(userMap).length, source: 'memory' });
      }
    });

    // =========================================================================
    // 👇👇👇 [SKRIPSI] BAGIAN INI ADALAH KODE UNTUK MENGELOLA PENGETAHUAN BOT (INTENT) 👇👇👇
    // =========================================================================
    // ========== INTENT MANAGEMENT API ==========

    const fs = require('fs');
    const intentsFilePath = path.join(__dirname, '..', 'data', 'intents.json');
    const entitiesFilePath = path.join(__dirname, '..', 'data', 'entities.json');

    // Helper: auto-reload NLP Engine setelah data intent berubah
    const autoReloadNLP = () => {
      try {
        const data = readIntents();
        const entitiesResolved = require.resolve(entitiesFilePath);
        delete require.cache[entitiesResolved];
        const entData = require(entitiesFilePath);
        this.nlpEngine.initialize(data.intents, entData);
        console.log('🔄 NLP Engine otomatis di-reload setelah perubahan intent');
      } catch (err) {
        console.error('⚠️ Gagal auto-reload NLP Engine:', err.message);
      }
    };

    // Helper: baca intents.json tanpa cache
    const readIntents = () => {
      const resolved = require.resolve(intentsFilePath);
      delete require.cache[resolved];
      return JSON.parse(fs.readFileSync(intentsFilePath, 'utf-8'));
    };

    // Helper: tulis intents.json
    const writeIntents = (data) => {
      fs.writeFileSync(intentsFilePath, JSON.stringify(data, null, 2), 'utf-8');
    };

    // GET: Semua intents
    this.app.get('/api/intents', (req, res) => {
      try {
        const data = readIntents();
        res.json({ intents: data.intents, total: data.intents.length });
      } catch (err) {
        console.error('❌ GET /api/intents error:', err);
        res.status(500).json({ error: err.message });
      }
    });

    // POST: Reload NLP Engine (harus didefinisikan SEBELUM POST /api/intents)
    this.app.post('/api/intents/reload', (req, res) => {
      try {
        const data = readIntents();

        // Clear entities cache
        const entitiesResolved = require.resolve(entitiesFilePath);
        delete require.cache[entitiesResolved];
        const entData = require(entitiesFilePath);

        this.nlpEngine.initialize(data.intents, entData);
        res.json({ success: true, message: 'NLP Engine berhasil di-reload!', intentsCount: data.intents.length });
      } catch (err) {
        console.error('❌ POST /api/intents/reload error:', err);
        res.status(500).json({ error: err.message });
      }
    });

    // POST: Tambah intent baru
    this.app.post('/api/intents', (req, res) => {
      try {
        const { tag, patterns, responses } = req.body;
        if (!tag || !patterns || !responses) {
          return res.status(400).json({ error: 'Tag, patterns, dan responses wajib diisi' });
        }

        const data = readIntents();

        // Cek duplikat
        if (data.intents.some(i => i.tag === tag)) {
          return res.status(409).json({ error: `Intent "${tag}" sudah ada` });
        }

        const patternsArr = Array.isArray(patterns) ? patterns : patterns.split('\n').map(p => p.trim()).filter(Boolean);
        // FIX: Jangan pecah response berdasarkan enter/newline, biarkan menjadi 1 kesatuan paragraf panjang
        const responsesArr = Array.isArray(responses) ? responses : [responses.trim()];

        data.intents.push({ tag, patterns: patternsArr, responses: responsesArr });
        writeIntents(data);
        autoReloadNLP();

        res.json({ success: true, message: `Intent "${tag}" berhasil ditambahkan (NLP auto-reload ✅)`, total: data.intents.length });
      } catch (err) {
        console.error('❌ POST /api/intents error:', err);
        res.status(500).json({ error: err.message });
      }
    });

    // PUT: Update intent
    this.app.put('/api/intents/:tag', (req, res) => {
      try {
        const { tag } = req.params;
        const { patterns, responses } = req.body;

        const data = readIntents();

        const idx = data.intents.findIndex(i => i.tag === tag);
        if (idx === -1) return res.status(404).json({ error: `Intent "${tag}" tidak ditemukan` });

        if (patterns) {
          data.intents[idx].patterns = Array.isArray(patterns) ? patterns : patterns.split('\n').map(p => p.trim()).filter(Boolean);
        }
        if (responses) {
          // FIX: Jangan pecah response berdasarkan enter/newline, biarkan menjadi 1 kesatuan paragraf panjang
          data.intents[idx].responses = Array.isArray(responses) ? responses : [responses.trim()];
        }

        writeIntents(data);
        autoReloadNLP();
        res.json({ success: true, message: `Intent "${tag}" berhasil diperbarui (NLP auto-reload ✅)`, intent: data.intents[idx] });
      } catch (err) {
        console.error('❌ PUT /api/intents error:', err);
        res.status(500).json({ error: err.message });
      }
    });

    // DELETE: Hapus intent
    this.app.delete('/api/intents/:tag', (req, res) => {
      try {
        const { tag } = req.params;

        const data = readIntents();

        const idx = data.intents.findIndex(i => i.tag === tag);
        if (idx === -1) return res.status(404).json({ error: `Intent "${tag}" tidak ditemukan` });

        data.intents.splice(idx, 1);
        writeIntents(data);
        autoReloadNLP();
        res.json({ success: true, message: `Intent "${tag}" berhasil dihapus (NLP auto-reload ✅)`, total: data.intents.length });
      } catch (err) {
        console.error('❌ DELETE /api/intents error:', err);
        res.status(500).json({ error: err.message });
      }
    });

    // Halaman utama
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
  }

  start(port) {
    const p = port || this.config.port || 3000;
    this.server = this.app.listen(p, () => {
      console.log(`📊 Dashboard: http://localhost:${p}`);
    });
  }

  stop() {
    if (this.server) this.server.close();
  }
}

module.exports = DashboardServer;
