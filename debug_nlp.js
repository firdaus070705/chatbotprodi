const intents = require('./data/intents.json');
const intent = intents.intents.find(i => i.tag === 'tanya_daftar_dosen_si');
console.log('--- RAW INTENT DATA ---');
console.log(JSON.stringify(intent, null, 2));

const NLPEngine = require('./lib/nlp/index.js');
const nlpEngine = new NLPEngine();
nlpEngine.initialize(intents.intents, {});
const result = nlpEngine.processMessage('dosen');
console.log('--- NLP RESPONSE ---');
console.log(result.response);
