/**
 * NLP Engine - Entry Point
 * =========================
 * Menggabungkan semua komponen NLP menjadi satu pipeline
 */

const IntentClassifier = require('./classifier');
const EntityExtractor = require('./entityExtractor');
const ResponseGenerator = require('./responseGenerator');
const { preprocess, tokenize } = require('./tokenizer');
// =========================================================================
// [SKRIPSI] BAGIAN INI ADALAH KODE UNTUK MEMPROSES PESAN (NLP ENGINE) 
// =========================================================================
class NLPEngine {
  constructor(config = {}) {
    this.config = config;
    this.classifier = new IntentClassifier();
    this.entityExtractor = new EntityExtractor();
    this.responseGenerator = new ResponseGenerator();
    this.ready = false;
  }

  /**
   * Inisialisasi NLP Engine dengan data training
   * @param {Array} intentsData - Data intents dari file JSON
   * @param {Object} entitiesData - Data entitas dari file JSON
   */
  initialize(intentsData, entitiesData = {}) {
    console.log('🧠 Menginisialisasi NLP Engine...');

    // Training classifier
    this.classifier.train(intentsData);

    // Load entitas
    this.entityExtractor.loadEntities(entitiesData);

    // Load response templates
    this.responseGenerator.loadIntents(intentsData);

    this.ready = true;
    console.log('✅ NLP Engine siap!');
  }

  /**
   * Proses pesan dan hasilkan respons
   * @param {string} message - Pesan dari pengguna
   * @returns {Object} - Hasil pemrosesan lengkap
   */
  processMessage(message) {
    if (!this.ready) {
      throw new Error('NLP Engine belum diinisialisasi! Panggil initialize() terlebih dahulu.');
    }

    const startTime = Date.now();

    // 1. Preprocessing
    const preprocessed = preprocess(message);
    const tokens = tokenize(message, { normalize: true, removeStopwords: false });

    // 2. Klasifikasi Intent
    const classification = this.classifier.classify(message);

    // 3. Ekstraksi Entitas
    const entities = this.entityExtractor.extract(message);

    // 4. Generate Respons
    const threshold = this.config.confidenceThreshold || 0.5;
    const responseResult = this.responseGenerator.generate(
      classification.intent,
      classification.confidence,
      entities,
      threshold
    );

    const processingTime = Date.now() - startTime;

    return {
      // Input
      originalMessage: message,
      preprocessedMessage: preprocessed,
      tokens: tokens,

      // NLP Results
      intent: classification.intent,
      confidence: classification.confidence,
      allClassifications: classification.allClassifications,
      entities: entities,

      // Response
      response: responseResult.response,
      isDefaultResponse: responseResult.isDefault,
      image: responseResult.image || null,
      document: responseResult.document || null,

      // Metadata
      processingTime: processingTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Mendapatkan statistik engine
   * @returns {Object} - Statistik engine
   */
  getStats() {
    return {
      ready: this.ready,
      intentsCount: this.classifier.intents.length,
      entitiesCategories: Object.keys(this.entityExtractor.entities).length,
      config: this.config
    };
  }
}

module.exports = NLPEngine;
