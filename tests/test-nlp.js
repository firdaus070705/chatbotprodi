/**
 * Test NLP Engine
 * ================
 * Script untuk menguji akurasi klasifikasi intent
 *
 * Jalankan: npm test  (atau: node tests/test-nlp.js)
 */

const NLPEngine = require('../lib/nlp');
const config = require('../config');
const intentsData = require('../data/intents.json');
const entitiesData = require('../data/entities.json');

console.log('');
console.log('🧪 ════════════════════════════════════');
console.log('   TEST NLP ENGINE');
console.log('🧪 ════════════════════════════════════');
console.log('');

// Inisialisasi NLP Engine
const nlpEngine = new NLPEngine(config.nlp);
nlpEngine.initialize(intentsData.intents, entitiesData);

// Test cases
const testCases = [
  { input: 'halo', expected: 'salam' },
  { input: 'selamat pagi', expected: 'salam' },
  { input: 'assalamualaikum', expected: 'salam' },
  { input: 'hai kak', expected: 'salam' },
  { input: 'makasih ya', expected: 'terima_kasih' },
  { input: 'thanks banget', expected: 'terima_kasih' },
  { input: 'terima kasih banyak', expected: 'terima_kasih' },
  { input: 'buka jam berapa ya?', expected: 'tanya_jam_operasional' },
  { input: 'jam kerja kantor', expected: 'tanya_jam_operasional' },
  { input: 'kapan buka?', expected: 'tanya_jam_operasional' },
  { input: 'dimana alamat kantornya?', expected: 'tanya_lokasi' },
  { input: 'lokasi di mana ya?', expected: 'tanya_lokasi' },
  { input: 'berapa harganya?', expected: 'tanya_harga' },
  { input: 'price list dong', expected: 'tanya_harga' },
  { input: 'kena berapa biayanya?', expected: 'tanya_harga' },
  { input: 'ada layanan apa saja?', expected: 'tanya_layanan' },
  { input: 'produk yang tersedia apa?', expected: 'tanya_layanan' },
  { input: 'saya mau komplain', expected: 'keluhan' },
  { input: 'barangnya rusak', expected: 'keluhan' },
  { input: 'pelayanan buruk sekali', expected: 'keluhan' },
  { input: 'nomor customer service berapa?', expected: 'tanya_kontak' },
  { input: 'mau hubungi admin', expected: 'tanya_kontak' },
  { input: 'bisa bayar pakai gopay?', expected: 'tanya_pembayaran' },
  { input: 'metode pembayaran apa saja?', expected: 'tanya_pembayaran' },
  { input: 'help', expected: 'bantuan' },
  { input: 'bisa bantu apa saja?', expected: 'bantuan' },
  { input: 'bye bye', expected: 'salam_perpisahan' },
  { input: 'sampai jumpa', expected: 'salam_perpisahan' },
  { input: 'lagi ada promo gak?', expected: 'promo' },
  { input: 'ada diskon?', expected: 'promo' },
  { input: 'cek status pesanan saya', expected: 'status_pesanan' },
  { input: 'sudah dikirim belum?', expected: 'status_pesanan' }
];

let passed = 0;
let failed = 0;

console.log('Menjalankan', testCases.length, 'test cases...\n');

testCases.forEach((tc, idx) => {
  const result = nlpEngine.processMessage(tc.input);
  const success = result.intent === tc.expected;
  if (success) {
    passed++;
    console.log(`  ✅ [${idx + 1}] "${tc.input}" → ${result.intent} (${result.confidence})`);
  } else {
    failed++;
    console.log(`  ❌ [${idx + 1}] "${tc.input}" → ${result.intent} (expected: ${tc.expected}) confidence: ${result.confidence}`);
  }
});

const accuracy = Math.round((passed / testCases.length) * 100);
console.log('\n════════════════════════════════════════');
console.log(`📊 HASIL TEST:`);
console.log(`   Total: ${testCases.length}`);
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   🎯 Akurasi: ${accuracy}%`);
console.log('════════════════════════════════════════');

// Entity extraction test
console.log('\n🔍 TEST ENTITY EXTRACTION');
console.log('══════════════════════════');
const entityTests = [
  'saya mau pesan paket premium',
  'bayar pakai gopay ya',
  'kirim ke alamat saya besok jam 10:00',
  'hubungi saya di 08123456789'
];

entityTests.forEach(msg => {
  const result = nlpEngine.processMessage(msg);
  console.log(`\n  📩 "${msg}"`);
  console.log(`     Intent: ${result.intent} (${result.confidence})`);
  const entityCount = Object.keys(result.entities).length;
  if (entityCount > 0) {
    for (const [cat, items] of Object.entries(result.entities)) {
      items.forEach(item => {
        console.log(`     🏷️ ${cat}: ${item.name} (keyword: "${item.matchedKeyword}")`);
      });
    }
  } else {
    console.log(`     🏷️ Tidak ada entitas terdeteksi`);
  }
});

console.log('\n✅ Test selesai!\n');
