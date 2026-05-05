/**
 * Intent Classifier menggunakan Naive Bayes + Exact Match
 * ========================================================
 * Mengklasifikasikan teks ke dalam intent yang sesuai
 * Prioritas: Exact Match → Similarity Match → Naive Bayes
 */

const natural = require('natural');
const { preprocess } = require('./tokenizer');
// =========================================================================
// 👇👇👇 [SKRIPSI] BAGIAN INI ADALAH RUMUS UNTUK MENEBAK MAKSUD PESAN (TEOREMA NAIVE BAYES) 👇👇👇
// =========================================================================
class IntentClassifier {
  constructor() {
    this.classifier = new natural.BayesClassifier();
    this.trained = false;
    this.intents = [];
    // Menyimpan mapping pattern → intent untuk exact match & similarity
    this.patternMap = new Map();       // preprocessed pattern → tag
    this.originalPatterns = new Map();  // preprocessed pattern → original pattern
  }

  /**
   * Training classifier dari data intents
   * @param {Array} intentsData - Array of { tag, patterns[], responses[] }
   */
  train(intentsData) {
    this.intents = intentsData;

    for (const intent of intentsData) {
      for (const pattern of intent.patterns) {
        // Preprocess setiap pattern sebelum training
        const processed = preprocess(pattern);
        this.classifier.addDocument(processed, intent.tag);

        // Simpan untuk exact match & similarity matching
        this.patternMap.set(processed.toLowerCase(), intent.tag);
        this.originalPatterns.set(processed.toLowerCase(), pattern);
      }
    }

    this.classifier.train();
    this.trained = true;
    console.log(`✅ Classifier trained dengan ${intentsData.length} intents, ${this.patternMap.size} patterns`);
  }

  /**
   * Klasifikasi teks ke intent
   * Menggunakan 3 layer: Exact Match → Similarity → Naive Bayes
   * @param {string} text - Teks yang akan diklasifikasikan
   * @returns {Object} - { intent, confidence, allClassifications }
   */
  classify(text) {
    if (!this.trained) {
      throw new Error('Classifier belum di-training! Panggil train() terlebih dahulu.');
    }

    const processed = preprocess(text).toLowerCase();

    // ============ LAYER 1: EXACT MATCH ============
    // Jika input persis sama dengan salah satu pattern → confidence 1.0
    if (this.patternMap.has(processed)) {
      const matchedTag = this.patternMap.get(processed);
      console.log(`🎯 Exact match: "${processed}" → ${matchedTag}`);
      return {
        intent: matchedTag,
        confidence: 1.0,
        allClassifications: [{ intent: matchedTag, confidence: 1.0 }]
      };
    }

    // ============ LAYER 2: SIMILARITY MATCH ============
    // Cek kesamaan dengan Jaro-Winkler distance untuk menangani typo ringan
    let bestSimilarity = 0;
    let bestTag = null;
    const similarityThreshold = 0.85; // Minimal 85% mirip

    for (const [pattern, tag] of this.patternMap) {
      const similarity = natural.JaroWinklerDistance(processed, pattern);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestTag = tag;
      }
    }

    if (bestSimilarity >= similarityThreshold && bestTag) {
      console.log(`🔍 Similarity match: "${processed}" → ${bestTag} (${Math.round(bestSimilarity * 100)}%)`);
      return {
        intent: bestTag,
        confidence: Math.round(bestSimilarity * 1000) / 1000,
        allClassifications: [{ intent: bestTag, confidence: Math.round(bestSimilarity * 1000) / 1000 }]
      };
    }

    // ============ LAYER 3: NAIVE BAYES ============
    const classifications = this.classifier.getClassifications(processed);
    const topClass = classifications[0];

    // Hitung confidence score (normalisasi dari nilai mentah klasifikasi natural)
    const totalScore = classifications.reduce((sum, c) => sum + c.value, 0);
    const confidence = totalScore > 0 ? topClass.value / totalScore : 0;

    return {
      intent: topClass.label,
      confidence: Math.round(confidence * 1000) / 1000,
      allClassifications: classifications.slice(0, 5).map(c => ({
        intent: c.label,
        confidence: totalScore > 0 ? Math.round((c.value / totalScore) * 1000) / 1000 : 0
      }))
    };
  }

  /**
   * Simpan model ke file
   * @param {string} filepath - Path file untuk menyimpan model
   */
  save(filepath) {
    return new Promise((resolve, reject) => {
      this.classifier.save(filepath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Load model dari file
   * @param {string} filepath - Path file model
   */
  load(filepath) {
    return new Promise((resolve, reject) => {
      natural.BayesClassifier.load(filepath, null, (err, classifier) => {
        if (err) reject(err);
        else {
          this.classifier = classifier;
          this.trained = true;
          resolve();
        }
      });
    });
  }
}

module.exports = IntentClassifier;
