const moment = require('moment-timezone');
const axios = require('axios');

module.exports = [
  {
    command: 'time',
    description: 'Current time in a city',
    category: 'tools',
    async run({ reply, text }) {
      const tz = text || 'Africa/Nairobi';
      try {
        reply(`🕐 *${tz}*\n${moment().tz(tz).format('dddd, MMMM Do YYYY • hh:mm:ss A')}`);
      } catch { reply('❌ Invalid timezone.'); }
    }
  },
  {
    command: 'lyrics',
    description: 'Search song lyrics',
    category: 'tools',
    async run({ reply, text }) {
      if (!text) return reply('🎤 Example: .lyrics faded alan walker');
      try {
        const { data } = await axios.get(`https://api.lyrics.ovh/v1/${text.split(' ').slice(1).join(' ')}/${text.split(' ')[0]}`);
        reply(`🎤 *Lyrics*\n\n${data.lyrics.slice(0, 1500)}`);
      } catch { reply('❌ Lyrics not found.'); }
    }
  },
  {
    command: 'short',
    description: 'Shorten a URL',
    category: 'tools',
    async run({ reply, text }) {
      if (!text.startsWith('http')) return reply('🔗 Send a URL.');
      try {
        const { data } = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(text)}`);
        reply(`🔗 *Short URL*\n${data}`);
      } catch { reply('❌ Failed.'); }
    }
  },
  {
    command: 'calc',
    description: 'Calculate math expression',
    category: 'tools',
    async run({ reply, text }) {
      if (!text) return reply('🧮 Example: .calc 2+2*10');
      try {
        const result = Function(`'use strict'; return (${text})`)();
        reply(`🧮 *${text}* = *${result}*`);
      } catch { reply('❌ Invalid expression.'); }
    }
  }
];