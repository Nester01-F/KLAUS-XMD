cat > plugins/search.js << 'EOF'
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = [
  {
    command: 'google',
    aliases: ['search'],
    description: 'Google search',
    category: 'search',
    async run({ reply, text }) {
      if (!text) return reply('🔍 Example: .google weather in Nairobi');
      try {
        const { data } = await axios.get(`https://api.giftedtech.my.id/api/search/google?apikey=gifted&query=${encodeURIComponent(text)}`);
        const results = data.result?.slice(0, 5) || [];
        const txt = results.map((r, i) =>
          `${i+1}. *${r.title}*\n${r.description || ''}\n🔗 ${r.url || ''}`
        ).join('\n\n');
        reply(`🔍 *SEARCH: ${text}*\n\n${txt}`);
      } catch { reply('❌ Search failed.'); }
    }
  },
  {
    command: 'image',
    aliases: ['imgsearch', 'img2'],
    description: 'Image search',
    category: 'search',
    async run({ sock, from, reply, text, msg }) {
      if (!text) return reply('🖼️ Example: .image sunset');
      try {
        const { data } = await axios.get(`https://api.giftedtech.my.id/api/search/pinterest?apikey=gifted&query=${encodeURIComponent(text)}`);
        const imgs = data.result?.slice(0, 4) || [];
        for (const url of imgs) {
          await sock.sendMessage(from, { image: { url }, caption: `🔍 ${text}` }, { quoted: msg });
        }
      } catch { reply('❌ No images found.'); }
    }
  },
  {
    command: 'news',
    description: 'Latest news',
    category: 'search',
    async run({ reply }) {
      try {
        const { data } = await axios.get('https://gnews.io/api/v4/top-headlines?lang=en&token=YOUR_KEY&max=5');
        const articles = data.articles || [];
        const txt = articles.map((a, i) =>
          `${i+1}. *${a.title}*\n${a.description?.slice(0, 100) || ''}\n🔗 ${a.url}`
        ).join('\n\n');
        reply(`📰 *TOP NEWS*\n\n${txt}`);
      } catch { reply('❌ Add gnews.io API key to enable news.'); }
    }
  }
];
