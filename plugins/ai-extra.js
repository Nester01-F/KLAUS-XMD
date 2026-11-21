const axios = require('axios');

module.exports = [
  {
    command: 'gemini',
    description: 'Ask Google Gemini',
    category: 'ai',
    async run({ reply, text }) {
      if (!text) return reply('✨ Example: .gemini explain gravity');
      try {
        const { data } = await axios.get(
          `https://api.giftedtech.my.id/api/ai/gemini?apikey=gifted&q=${encodeURIComponent(text)}`
        );
        reply(data.result || '🤷 No response.');
      } catch { reply('❌ Gemini failed.'); }
    }
  },
  {
    command: 'summarize',
    description: 'Summarize text',
    category: 'ai',
    async run({ reply, text }) {
      if (!text) return reply('📝 Paste text to summarize.');
      try {
        const { data } = await axios.get(
          `https://api.giftedtech.my.id/api/ai/gpt4?apikey=gifted&q=${encodeURIComponent('Summarize in 3 bullets: ' + text)}`
        );
        reply(`📝 *Summary*\n\n${data.result}`);
      } catch { reply('❌ Failed.'); }
    }
  }
];