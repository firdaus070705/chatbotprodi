/**
 * Response Generator
 * ===================
 * Menghasilkan respons berdasarkan intent dan entitas yang terdeteksi
 */
// =========================================================================
//  [SKRIPSI] BAGIAN INI ADALAH KODE UNTUK MENCARI JAWABAN YANG COCOK
// =========================================================================
class ResponseGenerator {
  constructor() {
    this.intentsData = [];
    this.defaultResponses = [
      'Maaf, saya belum paham pertanyaan kamu. Coba ulangi dengan kata-kata lain ya.',
      'Hmm, saya kurang ngerti maksudnya. Bisa diperjelas?',
      'Maaf, saya belum bisa jawab pertanyaan itu. Coba tanyakan hal lain ya.',
      'Saya belum paham pesan kamu. Ketik "help" untuk lihat apa saja yang bisa saya bantu.',
      'Mohon maaf, bisa ulangi pertanyaan kamu dengan cara yang berbeda?'
    ];
  }

  /**
   * Load data intents untuk response templates
   * @param {Array} intentsData - Data intents
   */
  loadIntents(intentsData) {
    this.intentsData = intentsData;
  }

  /**
   * Generate respons berdasarkan intent dan entitas
   * @param {string} intent - Intent yang terklasifikasi
   * @param {number} confidence - Confidence score
   * @param {Object} entities - Entitas yang diekstrak
   * @param {number} threshold - Confidence threshold minimum
   * @returns {Object} - { response, isDefault, intent, confidence }
   */
  generate(intent, confidence, entities = {}, threshold = 0.5) {
    // Jika confidence di bawah threshold, gunakan respons default
    if (confidence < threshold) {
      return {
        response: this.getRandomResponse(this.defaultResponses),
        isDefault: true,
        intent: intent,
        confidence: confidence
      };
    }

    // Cari intent yang sesuai
    const intentData = this.intentsData.find(i => i.tag === intent);
    if (!intentData || !intentData.responses || intentData.responses.length === 0) {
      return {
        response: this.getRandomResponse(this.defaultResponses),
        isDefault: true,
        intent: intent,
        confidence: confidence
      };
    }

    // Pilih respons acak dari template
    let response = this.getRandomResponse(intentData.responses);

    // Replace placeholder entitas dalam respons jika ada
    response = this.replacePlaceholders(response, entities);

    return {
      response: response,
      isDefault: false,
      intent: intent,
      confidence: confidence,
      image: intentData.image || null,
      document: intentData.document || null
    };
  }

  /**
   * Pilih respons acak dari array
   * @param {string[]} responses - Array respons
   * @returns {string} - Respons terpilih
   */
  getRandomResponse(responses) {
    const index = Math.floor(Math.random() * responses.length);
    return responses[index];
  }

  /**
   * Replace placeholder dalam respons dengan nilai entitas
   * @param {string} response - Template respons
   * @param {Object} entities - Entitas
   * @returns {string} - Respons dengan placeholder yang sudah diganti
   */
  replacePlaceholders(response, entities) {
    let result = response;

    for (const [category, items] of Object.entries(entities)) {
      if (items && items.length > 0) {
        const value = items.map(i => i.value).join(', ');
        result = result.replace(`{${category}}`, value);
      }
    }

    // Hapus placeholder yang tidak terganti
    result = result.replace(/\{[^}]+\}/g, '');

    return result;
  }
}

module.exports = ResponseGenerator;
