/**
 * MySQL Database Connection
 * ==========================
 * Koneksi ke MySQL menggunakan mysql2
 */

const mysql = require('mysql2/promise');
const config = require('../config');

let pool = null;

/**
 * Mendapatkan connection pool MySQL
 * @returns {Object} - MySQL connection pool
 */// =========================================================================
// 👇👇👇 [SKRIPSI] BAGIAN INI ADALAH KODE UNTUK MENGHUBUNGKAN APLIKASI KE DATABASE 👇👇👇
// =========================================================================
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log('✅ MySQL connection pool dibuat');
  }
  return pool;
}

/**
 * Execute query
 * @param {string} sql - SQL query
 * @param {Array} params - Parameters
 * @returns {Array} - Query results
 */
async function query(sql, params = []) {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Simpan log percakapan ke MySQL
 * @param {Object} logData - Data log
 */
async function saveConversationLog(logData) {
  const sql = `
    INSERT INTO conversation_logs 
    (sender, message, intent, confidence, response, is_default_response, entities, processing_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await query(sql, [
    logData.from || 'unknown',
    logData.message,
    logData.intent,
    logData.confidence,
    logData.response,
    logData.isDefaultResponse ? 1 : 0,
    JSON.stringify(logData.entities || {}),
    logData.processingTime || 0
  ]);
}

/**
 * Ambil log percakapan dari MySQL
 * @param {number} limit - Jumlah log
 * @returns {Array} - Array log
 */
async function getConversationLogs(limit = 50) {
  const sql = `
    SELECT * FROM conversation_logs 
    ORDER BY created_at DESC 
    LIMIT ?
  `;
  return await query(sql, [limit]);
}

/**
 * Ambil statistik dari MySQL
 * @returns {Object} - Statistik
 */
async function getStats() {
  const [totalResult] = await query('SELECT COUNT(*) as total FROM conversation_logs');
  const [avgResult] = await query('SELECT AVG(confidence) as avg_confidence FROM conversation_logs');
  const [defaultResult] = await query('SELECT COUNT(*) as total FROM conversation_logs WHERE is_default_response = 1');
  const intentResult = await query(`
    SELECT intent, COUNT(*) as count 
    FROM conversation_logs 
    GROUP BY intent 
    ORDER BY count DESC
  `);

  const intentDistribution = {};
  intentResult.forEach(row => {
    intentDistribution[row.intent] = row.count;
  });

  return {
    totalMessages: totalResult.total || 0,
    averageConfidence: Math.round((avgResult.avg_confidence || 0) * 1000) / 1000,
    defaultResponses: defaultResult.total || 0,
    intentDistribution
  };
}

/**
 * Ambil daftar pengguna chatbot
 * @returns {Array} - Daftar pengguna unik
 */
async function getUsers() {
  const sql = `
    SELECT 
      sender,
      COUNT(*) as total_messages,
      MIN(created_at) as first_message,
      MAX(created_at) as last_message,
      ROUND(AVG(confidence), 3) as avg_confidence,
      (SELECT intent FROM conversation_logs c2 
       WHERE c2.sender = c1.sender 
       GROUP BY intent ORDER BY COUNT(*) DESC LIMIT 1) as top_intent
    FROM conversation_logs c1
    GROUP BY sender
    ORDER BY last_message DESC
  `;
  return await query(sql);
}

/**
 * Test koneksi database
 * @returns {boolean} - Apakah koneksi berhasil
 */
async function testConnection() {
  try {
    await query('SELECT 1');
    console.log('✅ Koneksi MySQL berhasil');
    return true;
  } catch (error) {
    console.error('❌ Gagal koneksi MySQL:', error.message);
    return false;
  }
}

/**
 * Tutup pool
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  query,
  saveConversationLog,
  getConversationLogs,
  getStats,
  getUsers,
  testConnection,
  closePool
};
