const axios = require('axios');

module.exports = [
  {
    command: 'define',
    description: 'Dictionary lookup',
    category: 'tools',
    async run({ reply, text }) {
      if (!text) return reply('📖 Example: .define serendipity');
      try {
        const { data } = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${text}`);
        const d = data[0];
        const def = d.meanings[0].definitions[0];
        reply(`📖 *${d.word}*\n_${d.meanings[0].partOfSpeech}_\n\n${def.definition}${def.example ? `\n\n_"${def.example}"_` : ''}`);
      } catch { reply('❌ Word not found.'); }
    }
  },
  {
    command: 'wiki',
    description: 'Wikipedia summary',
    category: 'tools',
    async run({ reply, text }) {
      if (!text) return reply('📚 Example: .wiki Albert Einstein');
      try {
        const { data } = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`);
        reply(`📚 *${data.title}*\n\n${data.extract}\n\n🔗 ${data.content_urls?.desktop?.page || ''}`);
      } catch { reply('❌ Not found.'); }
    }
  },
  {
    command: 'currency',
    description: 'Convert currency',
    category: 'tools',
    async run({ reply, text }) {
      const [amt, from, to] = text.split(' ');
      if (!amt || !from || !to) return reply('💵 Example: .currency 100 USD KES');
      try {
        const { data } = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`);
        const rate = data.rates[to.toUpperCase()];
        if (!rate) return reply('❌ Invalid currency.');
        reply(`💵 *${amt} ${from.toUpperCase()}* = *${(amt * rate).toFixed(2)} ${to.toUpperCase()}*`);
      } catch { reply('❌ Failed.'); }
    }
  },
  {
    command: 'ip',
    description: 'IP address info',
    category: 'tools',
    async run({ reply, text }) {
      try {
        const { data } = await axios.get(`http://ip-api.com/json/${text || ''}`);
        reply(
`🌐 *IP INFO*
━━━━━━━━━━━━
IP: *${data.query}*
Country: ${data.country} ${data.countryCode}
City: ${data.city}
ISP: ${data.isp}
Timezone: ${data.timezone}`
        );
      } catch { reply('❌ Failed.'); }
    }
  },
  {
    command: 'password',
    description: 'Generate strong password',
    category: 'tools',
    async run({ reply, text }) {
      const len = Math.min(Math.max(parseInt(text) || 16, 6), 64);
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
      let pw = '';
      for (let i = 0; i < len; i++) pw += chars[Math.floor(Math.random() * chars.length)];
      reply(`🔐 *Password (${len} chars)*\n\`${pw}\``);
    }
  },
  {
    command: 'uuid',
    description: 'Generate UUID',
    category: 'tools',
    async run({ reply }) {
      const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
      reply(`🆔 *UUID*\n\`${uuid}\``);
    }
  }
];