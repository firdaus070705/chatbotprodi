/**
 * Tokenizer untuk Bahasa Indonesia
 * ==================================
 * Melakukan tokenisasi, normalisasi, dan preprocessing teks
 */

// Daftar stopwords Bahasa Indonesia
const STOPWORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'dengan', 'untuk',
  'pada', 'adalah', 'bahwa', 'atau', 'juga', 'akan', 'sudah', 'telah',
  'oleh', 'saya', 'kami', 'kita', 'mereka', 'dia', 'ia', 'nya',
  'se', 'ber', 'lah', 'pun', 'kan', 'dong', 'sih', 'deh', 'nih',
  'ya', 'tidak', 'bukan', 'belum', 'ada', 'bisa', 'mau', 'harus',
  'sangat', 'lebih', 'paling', 'sekali', 'lagi', 'masih', 'kalau',
  'jika', 'maka', 'karena', 'sebab', 'agar', 'supaya', 'tetapi',
  'namun', 'sedangkan', 'meskipun', 'walaupun'
]);

// Normalisasi kata-kata informal / slang Bahasa Indonesia
// CATATAN: Jangan normalize kata yang sudah jadi pattern di intents.json
// (contoh: mau, thanks, ok, makasih, dll sudah ada sebagai pattern)
const NORMALIZATION_MAP = {
  'gak': 'tidak',
  'ga': 'tidak',
  'gk': 'tidak',
  'ngga': 'tidak',
  'nggak': 'tidak',
  'tdk': 'tidak',
  'gpp': 'tidak apa-apa',
  'yg': 'yang',
  'dg': 'dengan',
  'dgn': 'dengan',
  'sm': 'sama',
  'dr': 'dari',
  'utk': 'untuk',
  'tp': 'tapi',
  'tpi': 'tapi',
  'bs': 'bisa',
  'lg': 'lagi',
  'sdh': 'sudah',
  'udh': 'sudah',
  'udah': 'sudah',
  'blm': 'belum',
  'blom': 'belum',
  'krn': 'karena',
  'karna': 'karena',
  'gmn': 'bagaimana',
  'gmna': 'bagaimana',
  'dmn': 'dimana',
  'knp': 'kenapa',
  'knpa': 'kenapa',
  'brp': 'berapa',
  'sy': 'saya',
  'ak': 'saya',
  'gw': 'saya',
  'gue': 'saya',
  'kmu': 'kamu',
  'km': 'kamu',
  'lu': 'kamu',
  'lo': 'kamu',
  'msh': 'masih',
  'bgt': 'banget',
  'bngt': 'banget',
  'bkn': 'bukan',
  'hrs': 'harus',
  'jg': 'juga',
  'jgn': 'jangan',
  'trs': 'terus',
  'trus': 'terus',
  'lbh': 'lebih',
  'smua': 'semua',
  'org': 'orang',
  'krm': 'kirim',
  'pgn': 'ingin',
  'pengen': 'ingin'
};

/**
 * Membersihkan dan menormalisasi teks
 * @param {string} text - Teks mentah
 * @returns {string} - Teks yang sudah dinormalisasi
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';

  let normalized = text.toLowerCase().trim();

  // Hapus URL
  normalized = normalized.replace(/https?:\/\/\S+/g, '');

  // Hapus emoji (unicode ranges)
  normalized = normalized.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
    ''
  );

  // Hapus tanda baca kecuali tanda tanya (berguna untuk deteksi pertanyaan)
  normalized = normalized.replace(/[^\w\s?]/g, ' ');

  // Hapus spasi berlebih
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Tokenisasi teks menjadi array kata
 * @param {string} text - Teks yang akan di-tokenisasi
 * @param {Object} options - Opsi tokenisasi
 * @param {boolean} options.removeStopwords - Hapus stopwords (default: false)
 * @param {boolean} options.normalize - Normalisasi kata slang (default: true)
 * @returns {string[]} - Array token
 */
function tokenize(text, options = {}) {
  const { removeStopwords = false, normalize = true } = options;

  const normalizedText = normalizeText(text);
  if (!normalizedText) return [];

  let tokens = normalizedText.split(' ').filter(t => t.length > 0);

  // Normalisasi kata slang/informal
  if (normalize) {
    tokens = tokens.map(token => NORMALIZATION_MAP[token] || token);
    // Flatten tokens yang hasil normalisasinya mengandung spasi
    tokens = tokens.flatMap(token => token.split(' '));
  }

  // Hapus stopwords jika diminta
  if (removeStopwords) {
    tokens = tokens.filter(token => !STOPWORDS.has(token));
  }

  return tokens;
}

/**
 * Preprocessing teks lengkap untuk NLP
 * @param {string} text - Teks mentah
 * @returns {string} - Teks yang sudah diproses
 */
function preprocess(text) {
  const tokens = tokenize(text, { removeStopwords: false, normalize: true });
  return tokens.join(' ');
}

module.exports = {
  normalizeText,
  tokenize,
  preprocess,
  STOPWORDS,
  NORMALIZATION_MAP
};
