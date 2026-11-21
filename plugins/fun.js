const axios = require('axios');

module.exports = [
  {
    command: 'joke',
    description: 'Random joke',
    category: 'fun',
    async run({ reply }) {
      const { data } = await axios.get('https://official-joke-api.appspot.com/random_joke');
      reply(`😂 *${data.setup}*\n\n||${data.punchline}||`);
    }
  },
  {
    command: '8ball',
    description: 'Magic 8-ball',
    category: 'fun',
    async run({ reply, text }) {
      if (!text) return reply('🎱 Ask a question.');
      const answers = ['Yes ✅','No ❌','Maybe 🤔','Definitely 💯','Never 🙅','Ask again 🔁','Absolutely ✨','Doubt it 😬'];
      reply(`🎱 *Q:* ${text}\n* A:* ${answers[Math.floor(Math.random()*answers.length)]}`);
    }
  },
  {
    command: 'ship',
    description: 'Ship two people',
    category: 'fun',
    async run({ reply, text }) {
      const p = text.split(/[+&,]|\band\b/).map(s=>s.trim()).filter(Boolean);
      if (p.length < 2) return reply('💞 Example: .ship Klaus + You');
      const pct = Math.floor(Math.random()*101);
      reply(`💞 *${p[0]}* + *${p[1]}*\n📊 Compatibility: *${pct}%*\n${'❤️'.repeat(Math.ceil(pct/20))}`);
    }
  }
];