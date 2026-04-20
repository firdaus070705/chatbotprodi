/**
 * Chatbot Manager - Singleton
 * ============================
 * Mengelola instance NLP Engine dan WhatsApp Client
 * sebagai singleton agar persist antar request di Next.js
 */

const NLPEngine = require('./nlp');
const WhatsAppClient = require('./whatsapp/client');
const path = require('path');

// Menggunakan globalThis agar singleton persist di semua context Next.js
// (custom server DAN API routes berbagi instance yang sama)

class ChatbotManager {
  constructor() {
    this.nlpEngine = null;
    this.waClient = null;
    this.config = null;
    this.initialized = false;
  }

  /**
   * Inisialisasi chatbot (NLP Engine + WhatsApp Client)
   * @param {Object} config - Konfigurasi
   */
  initialize(config) {
    if (this.initialized) {
      console.log('ℹ️ Chatbot sudah diinisialisasi sebelumnya');
      return;
    }

    this.config = config;

    // Load training data
    const intentsData = require(path.join(process.cwd(), 'data', 'intents.json'));
    const entitiesData = require(path.join(process.cwd(), 'data', 'entities.json'));

    // 1. Inisialisasi NLP Engine
    console.log('🧠 [1/2] Memulai NLP Engine...');
    this.nlpEngine = new NLPEngine(config.nlp || {});
    this.nlpEngine.initialize(intentsData.intents, entitiesData);

    // Quick test
    console.log('🧪 Quick test:');
    ['halo', 'berapa harga', 'terima kasih'].forEach(msg => {
      const r = this.nlpEngine.processMessage(msg);
      console.log(`   "${msg}" → ${r.intent} (${r.confidence})`);
    });

    // 2. Inisialisasi WhatsApp Client
    console.log('\n📱 [2/2] Memulai WhatsApp Client...');
    this.waClient = new WhatsAppClient(this.nlpEngine, {
      sessionName: config.whatsapp?.sessionName || 'chatbot-session',
      maxLogs: config.logging?.maxLogs || 1000,
      dashboardPort: config.dashboard?.port || 3000
    });

    this.waClient.onReady(() => {
      console.log('\n🎉 ════════════════════════════════════');
      console.log('   CHATBOT AKTIF & SIAP MENERIMA PESAN!');
      console.log('🎉 ════════════════════════════════════\n');
    });

    this.waClient.onMessage((result) => {
      console.log(`📊 [${result.intent}] confidence: ${result.confidence} | ${result.processingTime}ms`);
    });

    this.waClient.initialize();
    this.initialized = true;
  }

  /**
   * Dapatkan NLP Engine
   */
  getNLPEngine() {
    return this.nlpEngine;
  }

  /**
   * Dapatkan WhatsApp Client
   */
  getWhatsAppClient() {
    return this.waClient;
  }

  /**
   * Cek apakah sudah diinisialisasi
   */
  isInitialized() {
    return this.initialized;
  }
}

/**
 * Dapatkan singleton instance ChatbotManager
 * @returns {ChatbotManager}
 */
function getChatbotManager() {
  if (!global.__chatbotManager) {
    global.__chatbotManager = new ChatbotManager();
  }
  return global.__chatbotManager;
}

module.exports = { ChatbotManager, getChatbotManager };
