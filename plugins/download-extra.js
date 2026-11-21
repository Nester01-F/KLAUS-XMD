const axios = require('axios');
const yts = require('yt-search');

module.exports = [
  {
    command: 'ytmp4',
    description: 'YouTube video downloader',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text) return reply('🎬 Example: .ytmp4 https://youtu.be/...');
      const id = text.match(/(?:youtu\.be\/|v=)([\w-]{11})/)?.[1];
      if (!id) return reply('❌ Invalid YouTube URL.');
      const info = await yts({ videoId: id });
      await sock.sendMessage(from, {
        image: { url: info.thumbnail },
        caption: `🎬 *${info.title}*\n⏱️ ${info.timestamp}\n\n_Processing..._`
      }, { quoted: msg });
      try {
        const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/ytmp4?apikey=gifted&url=${encodeURIComponent(text)}`);
        await sock.sendMessage(from, {
          video: { url: data.result.download_url },
          caption: `✅ *${info.title}*`
        }, { quoted: msg });
      } catch { reply('❌ Download failed.'); }
    }
  },
  {
    command: 'ig',
    aliases: ['instagram'],
    description: 'Instagram downloader',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text.includes('instagram.com')) return reply('📸 Send an Instagram link.');
      try {
        const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/igdl?apikey=gifted&url=${encodeURIComponent(text)}`);
        for (const item of data.result.slice(0, 5)) {
          const isVideo = item.url.includes('.mp4');
          await sock.sendMessage(from, isVideo
            ? { video: { url: item.url }, caption: '📸 KLAUS XMD' }
            : { image: { url: item.url }, caption: '📸 KLAUS XMD' }, { quoted: msg });
        }
      } catch { reply('❌ Download failed.'); }
    }
  },
  {
    command: 'fb',
    aliases: ['facebook'],
    description: 'Facebook downloader',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text.includes('facebook.com')) return reply('📘 Send a Facebook link.');
      try {
        const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/fbdl?apikey=gifted&url=${encodeURIComponent(text)}`);
        await sock.sendMessage(from, { video: { url: data.result.hd || data.result.sd } }, { quoted: msg });
      } catch { reply('❌ Download failed.'); }
    }
  },
  {
    command: 'spotify',
    description: 'Spotify track download',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text.includes('spotify.com')) return reply('🎵 Send a Spotify link.');
      try {
        const { data } = await axios.get(`https://api.giftedtech.my.id/api/download/spotify?apikey=gifted&url=${encodeURIComponent(text)}`);
        await sock.sendMessage(from, {
          image: { url: data.result.thumbnail },
          caption: `🎵 *${data.result.title}*\n👤 ${data.result.artist}`
        }, { quoted: msg });
        await sock.sendMessage(from, {
          audio: { url: data.result.download_url },
          mimetype: 'audio/mp4'
        }, { quoted: msg });
      } catch { reply('❌ Download failed.'); }
    }
  }
];