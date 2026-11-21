const yts = require('yt-search');
const axios = require('axios');

module.exports = [
  {
    command: 'play',
    description: 'YouTube audio',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text) return reply('🎵 Example: .play faded');
      const { videos } = await yts(text);
      const v = videos[0];
      if (!v) return reply('❌ Not found.');

      // Uses public API (may change — swap for your own yt-dlp endpoint)
      const api = `https://api.vevioz.com/api/button/mp3/${v.videoId}`;
      await sock.sendMessage(from, {
        image: { url: v.thumbnail },
        caption:
`🎧 *${v.title}*
⏱️ ${v.timestamp}
👤 ${v.author.name}
🔗 ${v.url}

_Generating audio..._`
      }, { quoted: msg });

      // In production, use a stable yt-dlp API. Placeholder:
      await reply('⚠️ Add your yt-dlp API endpoint to enable audio delivery.');
    }
  },
  {
    command: 'tiktok',
    description: 'Download TikTok',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text.includes('tiktok.com')) return reply('📱 Send a TikTok link.');
      try {
        const { data } = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(text)}`);
        if (!data.data) return reply('❌ Failed.');
        await sock.sendMessage(from, {
          video: { url: data.data.play },
          caption: `🎵 ${data.data.title}\n> KLAUS XMD`
        }, { quoted: msg });
      } catch { reply('❌ Download failed.'); }
    }
  }
];