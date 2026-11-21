const axios = require('axios');

module.exports = [
  {
    command: 'twitter', aliases: ['x'],
    description: 'Download Twitter/X video',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!/twitter\.com|x\.com/.test(text)) return reply('🐦 Send a Twitter/X link.');
      try {
        const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/twitter?apikey=gifted&url=${encodeURIComponent(text)}`);
        const v = data.result?.media?.[0]?.url || data.result?.url;
        await sock.sendMessage(from, { video: { url: v }, caption: '🐦 KLAUS XMD' }, { quoted: msg });
      } catch { reply('❌ Download failed.'); }
    }
  },
  {
    command: 'pinterest', aliases: ['pin'],
    description: 'Download Pinterest image',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text.includes('pinterest')) return reply('📌 Send a Pinterest link.');
      try {
        const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/pinterest?apikey=gifted&url=${encodeURIComponent(text)}`);
        const imgs = data.result?.media || [];
        for (const u of imgs.slice(0, 3)) {
          await sock.sendMessage(from, { image: { url: u }, caption: '📌 KLAUS XMD' }, { quoted: msg });
        }
      } catch { reply('❌ Failed.'); }
    }
  },
  {
    command: 'lyrics2', aliases: ['song'],
    description: 'Search song via iTunes',
    category: 'download',
    async run({ reply, text }) {
      if (!text) return reply('🎵 Example: .song faded');
      try {
        const { data } = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(text)}&limit=1`);
        const t = data.results[0];
        if (!t) return reply('❌ Not found.');
        reply(`🎵 *${t.trackName}*\n👤 ${t.artistName}\n💿 ${t.collectionName}\n🔗 ${t.trackViewUrl}`);
      } catch { reply('❌ Failed.'); }
    }
  }
];