/**
 * ============================================
 *  CHATBOT WHATSAPP BERBASIS NLP
 *  Express.js + MySQL + QR Dashboard
 * ============================================
 *
 * Cara menjalankan:
 *   1. Pastikan MySQL sudah berjalan
 *   2. npm run setup-db   (pertama kali saja)
 *   3. npm run dev
 *   4. Buka http://localhost:3000
 *   5. Scan QR code di dashboard
 */

const config = require('./config');
const NLPEngine = require('./lib/nlp');
const WhatsAppClient = require('./lib/whatsapp/client');
const DashboardServer = require('./dashboard/server');
const db = require('./database/connection');

const intentsData = require('./data/intents.json');
const entitiesData = require('./data/entities.json');

console.log('');
console.log('╔══════════════════════════════════════════╗');
console.log('║   🤖 CHATBOT WHATSAPP BERBASIS NLP      ║');
console.log('║   Express.js + MySQL                     ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');
// =========================================================================
// 👇👇👇 [SKRIPSI] BAGIAN INI ADALAH KODE UTAMA YANG MENJALANKAN SELURUH APLIKASI 👇👇👇
// =========================================================================
// 1. Test MySQL
(async () => {
  console.log('🗄️  [1/4] Mengecek koneksi MySQL...');
  const dbOk = await db.testConnection();
  if (!dbOk) {
    console.log('⚠️  MySQL tidak tersedia. Log akan disimpan di memory saja.');
    console.log('   Jalankan "npm run setup-db" untuk setup database.\n');
  }

  // 2. NLP Engine
  console.log('🧠 [2/4] Memulai NLP Engine...');
  const nlpEngine = new NLPEngine(config.nlp);
  nlpEngine.initialize(intentsData.intents, entitiesData);

  console.log('🧪 Quick test:');
  ['halo', 'biaya spp', 'ujian proposal'].forEach(msg => {
    const r = nlpEngine.processMessage(msg);
    console.log(`   "${msg}" → ${r.intent} (${r.confidence})`);
  });

  // 3. WhatsApp Client
  console.log('\n📱 [3/4] Memulai WhatsApp Client...');
  const waClient = new WhatsAppClient(nlpEngine, {
    sessionName: config.whatsapp.sessionName,
    maxLogs: config.logging.maxLogs
  });
  waClient.useDatabase = dbOk;

  waClient.onReady(() => {
    console.log('\n🎉 ════════════════════════════════════');
    console.log('   CHATBOT AKTIF & SIAP MENERIMA PESAN!');
    console.log('🎉 ════════════════════════════════════\n');
  });

  waClient.onMessage((result) => {
    console.log(`📊 [${result.intent}] confidence: ${result.confidence} | ${result.processingTime}ms`);
  });

  await waClient.initialize();

  // 4. Dashboard
  console.log('📊 [4/4] Memulai Dashboard...');
  const dashboard = new DashboardServer(waClient, nlpEngine, config.dashboard);
  dashboard.start(config.dashboard.port);

  console.log('\n📲 Buka dashboard untuk scan QR code:');
  console.log(`   http://localhost:${config.dashboard.port}\n`);

})().catch(err => {
  console.error('❌ Error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Menghentikan chatbot...');
  await db.closePool();
  console.log('👋 Sampai jumpa!');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});
