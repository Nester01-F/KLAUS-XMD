const axios = require('axios');
const moment = require('moment-timezone');

module.exports = [
  {
    command: 'uptime',
    description: 'Bot uptime',
    category: 'tools',
    async run({ reply }) {
      const { getDB } = require('../lib/database');
      const db = getDB();
      const sec = Math.floor((Date.now() - db.stats.startedAt) / 1000);
      const d = Math.floor(sec / 86400);
      const h = Math.floor((sec % 86400) / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      reply(`⏱️ *UPTIME*\n${d}d ${h}h ${m}m ${s}s`);
    }
  },
  {
    command: 'timezones',
    aliases: ['tz'],
    description: 'Current time in major cities',
    category: 'tools',
    async run({ reply }) {
      const zones = ['Africa/Nairobi', 'Africa/Lagos', 'Europe/London', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney'];
      const list = zones.map(z =>
        `📍 ${z.split('/')[1].replace('_', ' ')}: *${moment().tz(z).format('HH:mm')}*`
      ).join('\n');
      reply(`🌍 *WORLD TIME*\n━━━━━━━━━━━━━━━\n${list}`);
    }
  },
  {
    command: 'coin',
    aliases: ['flipcoin'],
    description: 'Flip a coin',
    category: 'tools',
    async run({ reply }) {
      const r = Math.random() < 0.5 ? 'HEAD' : 'TAIL';
      reply(`🪙 *${r}*`);
    }
  },
  {
    command: 'dice',
    aliases: ['roll'],
    description: 'Roll a dice',
    category: 'tools',
    async run({ reply, text }) {
      const sides = parseInt(text) || 6;
      const result = Math.floor(Math.random() * sides) + 1;
      reply(`🎲 *You rolled:* ${result} (d${sides})`);
    }
  },
  {
    command: 'random',
    description: 'Random number in range',
    category: 'tools',
    async run({ reply, text }) {
      const [min, max] = text.split(/[- ,]+/).map(Number);
      if (isNaN(min) || isNaN(max)) return reply('🔢 Example: .random 1-100');
      const n = Math.floor(Math.random() * (max - min + 1)) + min;
      reply(`🎲 Random number: *${n}*`);
    }
  },
  {
    command: 'chucknorris',
    aliases: ['chuck'],
    description: 'Random Chuck Norris joke',
    category: 'fun',
    async run({ reply }) {
      try {
        const { data } = await axios.get('https://api.chucknorris.io/jokes/random');
        reply(`💪 ${data.value}`);
      } catch { reply('❌ Failed.'); }
    }
  },
  {
    command: 'github',
    aliases: ['gh'],
    description: 'Get GitHub user info',
    category: 'tools',
    async run({ reply, text }) {
      if (!text) return reply('🐙 Example: .github torvalds');
      try {
        const { data } = await axios.get(`https://api.github.com/users/${text}`);
        reply(
`🐙 *GITHUB: ${data.login}*
━━━━━━━━━━━━━━━
📛 Name: *${data.name || 'N/A'}*
👥 Followers: *${data.followers}*
📦 Repos: *${data.public_repos}*
📍 Location: ${data.location || 'N/A'}
🔗 ${data.html_url}`
        );
      } catch { reply('❌ User not found.'); }
    }
  },
  {
    command: 'npm',
    aliases: ['package'],
    description: 'Look up npm package',
    category: 'tools',
    async run({ reply, text }) {
      if (!text) return reply('📦 Example: .npm express');
      try {
        const { data } = await axios.get(`https://registry.npmjs.org/${text}`);
        reply(
`📦 *${data.name}*
━━━━━━━━━━━━━━━
📝 ${data.description || 'no description'}
🔢 Version: *${data['dist-tags'].latest}*
📜 License: *${data.license || 'N/A'}*
🔗 https://npmjs.com/package/${data.name}`
        );
      } catch { reply('❌ Package not found.'); }
    }
  }
];