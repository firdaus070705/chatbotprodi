/**
 * Database Setup Script
 * ======================
 * Membuat database dan tabel yang diperlukan
 * 
 * Jalankan: npm run setup-db
 * 
 * Pastikan MySQL sudah berjalan di komputer Anda!
 */

const mysql = require('mysql2/promise');
const config = require('../config');
// =========================================================================
// 👇👇👇 [SKRIPSI] BAGIAN INI ADALAH KODE UNTUK MEMBUAT DATABASE & TABEL BARU 👇👇👇
// =========================================================================
async function setupDatabase() {
  console.log('');
  console.log('🗄️  ════════════════════════════════');
  console.log('   SETUP DATABASE MySQL');
  console.log('🗄️  ════════════════════════════════');
  console.log('');

  // 1. Koneksi tanpa database (untuk membuat database)
  console.log('📋 [1/3] Menghubungkan ke MySQL...');
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password
    });
    console.log('✅ Terhubung ke MySQL');
  } catch (error) {
    console.error('❌ Gagal terhubung ke MySQL!');
    console.error('   Pastikan MySQL sudah berjalan.');
    console.error('   Error:', error.message);
    console.error('');
    console.error('   Konfigurasi saat ini:');
    console.error(`   Host: ${config.database.host}`);
    console.error(`   Port: ${config.database.port}`);
    console.error(`   User: ${config.database.user}`);
    console.error('');
    console.error('   Ubah konfigurasi di file config.js jika diperlukan.');
    process.exit(1);
  }

  // 2. Buat database
  console.log(`📋 [2/3] Membuat database "${config.database.database}"...`);
  try {
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS \`${config.database.database}\` 
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log('✅ Database dibuat/sudah ada');

    await connection.execute(`USE \`${config.database.database}\``);
  } catch (error) {
    console.error('❌ Gagal membuat database:', error.message);
    process.exit(1);
  }

  // 3. Buat tabel
  console.log('📋 [3/3] Membuat tabel...');

  // Tabel: conversation_logs
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS conversation_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender VARCHAR(100) NOT NULL COMMENT 'Nomor/ID pengirim WhatsApp',
      message TEXT NOT NULL COMMENT 'Pesan dari pengguna',
      intent VARCHAR(100) NOT NULL COMMENT 'Intent yang terdeteksi',
      confidence DECIMAL(5,3) NOT NULL COMMENT 'Confidence score (0-1)',
      response TEXT NOT NULL COMMENT 'Respons chatbot',
      is_default_response TINYINT(1) DEFAULT 0 COMMENT 'Apakah respons default',
      entities JSON COMMENT 'Entitas yang terdeteksi (JSON)',
      processing_time INT DEFAULT 0 COMMENT 'Waktu proses (ms)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu pesan masuk',
      INDEX idx_intent (intent),
      INDEX idx_sender (sender),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Log percakapan chatbot'
  `);
  console.log('   ✅ Tabel "conversation_logs" dibuat');

  // Tabel: intents (opsional, untuk menyimpan intents di database)
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS intents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tag VARCHAR(100) NOT NULL UNIQUE COMMENT 'Nama intent',
      patterns JSON NOT NULL COMMENT 'Pola kalimat (JSON array)',
      responses JSON NOT NULL COMMENT 'Template respons (JSON array)',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tag (tag)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Data training intents NLP'
  `);
  console.log('   ✅ Tabel "intents" dibuat');

  // Tabel: bot_sessions
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS bot_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_name VARCHAR(100) NOT NULL,
      status ENUM('online', 'offline', 'connecting') DEFAULT 'offline',
      started_at TIMESTAMP NULL,
      ended_at TIMESTAMP NULL,
      total_messages INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT='Sesi bot WhatsApp'
  `);
  console.log('   ✅ Tabel "bot_sessions" dibuat');

  await connection.end();

  console.log('');
  console.log('🎉 ════════════════════════════════');
  console.log('   DATABASE SETUP SELESAI!');
  console.log(`   Database: ${config.database.database}`);
  console.log('   Tabel: conversation_logs, intents, bot_sessions');
  console.log('🎉 ════════════════════════════════');
  console.log('');
  console.log('Selanjutnya jalankan: npm run dev');
  console.log('');
}

setupDatabase().catch(err => {
  console.error('❌ Setup gagal:', err.message);
  process.exit(1);
});
