/**
 * Konfigurasi Chatbot WhatsApp Berbasis NLP
 */
module.exports = {
  // Dashboard
  dashboard: {
    port: 3000,
    title: 'Chatbot WhatsApp NLP - Dashboard'
  },

  // NLP Settings
  nlp: {
    confidenceThreshold: 0.3,
    language: 'id'
  },

  // WhatsApp Settings
  whatsapp: {
    sessionName: 'chatbot-session'
  },

  // MySQL Database
  database: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'chatbot_wa_nlp'
  },

  // Logging
  logging: {
    enabled: true,
    maxLogs: 1000
  }
};
