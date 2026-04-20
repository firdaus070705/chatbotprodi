/**
 * Entity Extractor
 * =================
 * Mengekstrak entitas (nama, tanggal, waktu, dll) dari teks
 */

const { tokenize } = require('./tokenizer');

class EntityExtractor {
  constructor() {
    this.entities = {};
  }

  /**
   * Load definisi entitas dari data
   * @param {Object} entitiesData - Data definisi entitas
   */
  loadEntities(entitiesData) {
    this.entities = entitiesData;
    console.log(`✅ Entities loaded: ${Object.keys(entitiesData).length} kategori`);
  }

  /**
   * Ekstrak entitas dari teks
   * @param {string} text - Teks input
   * @returns {Object} - Entitas yang ditemukan
   */
  extract(text) {
    const result = {};
    const lowerText = text.toLowerCase();
    const tokens = tokenize(text, { normalize: true, removeStopwords: false });
    const joinedTokens = tokens.join(' ');

    // 1. Ekstrak berdasarkan definisi entitas
    for (const [category, items] of Object.entries(this.entities)) {
      for (const item of items) {
        const keywords = item.keywords || [item.name.toLowerCase()];
        for (const keyword of keywords) {
          if (lowerText.includes(keyword.toLowerCase()) || joinedTokens.includes(keyword.toLowerCase())) {
            if (!result[category]) result[category] = [];
            if (!result[category].find(e => e.name === item.name)) {
              result[category].push({
                name: item.name,
                value: item.value || item.name,
                matchedKeyword: keyword
              });
            }
          }
        }
      }
    }

    // 2. Ekstrak waktu/jam
    const timePatterns = [
      /(\d{1,2})[:.:](\d{2})\s*(pagi|siang|sore|malam)?/i,
      /jam\s+(\d{1,2})\s*(pagi|siang|sore|malam)?/i,
      /pukul\s+(\d{1,2})[:.:]?(\d{2})?\s*(wib|wit|wita)?/i
    ];

    for (const pattern of timePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        result.waktu = result.waktu || [];
        result.waktu.push({
          name: 'waktu',
          value: match[0],
          matchedKeyword: match[0]
        });
        break;
      }
    }

    // 3. Ekstrak tanggal
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
      /(senin|selasa|rabu|kamis|jumat|sabtu|minggu)/i,
      /(hari ini|besok|lusa|kemarin)/i
    ];

    for (const pattern of datePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        result.tanggal = result.tanggal || [];
        result.tanggal.push({
          name: 'tanggal',
          value: match[0],
          matchedKeyword: match[0]
        });
        break;
      }
    }

    // 4. Ekstrak angka/jumlah
    const numberMatch = lowerText.match(/(\d+)\s*(buah|unit|pcs|orang|item|kg|gram|liter|biji)/i);
    if (numberMatch) {
      result.jumlah = [{
        name: 'jumlah',
        value: `${numberMatch[1]} ${numberMatch[2]}`,
        matchedKeyword: numberMatch[0]
      }];
    }

    // 5. Ekstrak nomor telepon
    const phoneMatch = lowerText.match(/(0|\+62)\d{8,12}/);
    if (phoneMatch) {
      result.telepon = [{
        name: 'telepon',
        value: phoneMatch[0],
        matchedKeyword: phoneMatch[0]
      }];
    }

    return result;
  }
}

module.exports = EntityExtractor;
