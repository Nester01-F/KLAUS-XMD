const axios = require('axios');
const yts = require('yt-search');

const API = 'https://apix.wolvarex.com';
const KEY = process.env.WOLVAREX_KEY || 'wxa_f_2fca8d14eb';
const api = (path) => `${API}${path}${path.includes('?') ? '&' : '?'}key=${KEY}`;

module.exports = [
  /* ============ 🎬 YTMP4 ============ */
  {
    command: 'ytmp4',
    aliases: ['ytvideo'],
    description: 'Download YouTube video (MP4)',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text) return reply('🎬 Example: .ytmp4 https://youtu.be/dQw4w9WgXcQ');
      const id = text.match(/(?:youtu\.be\/|v=)([\w-]{11})/)?.[1] || text.trim();
      if (!/^[\w-]{11}$/.test(id)) return reply('❌ Invalid YouTube ID/URL.');

      let info;
      try { info = await yts({ videoId: id }); }
      catch { return reply('❌ Could not fetch video info.'); }

      await sock.sendMessage(from, {
        image: { url: info.thumbnail },
        caption: `🎬 *${info.title}*\n⏱️ ${info.timestamp}\n\n_Processing..._`
      }, { quoted: msg });

      try {
        const { data } = await axios.get(
          api(`/api/music/ytmp4-download?id=${id}&quality=480&provider=ytmp4`),
          { timeout: 60000 }
        );

        const videoUrl = data?.result?.download_url || data?.result?.url || data?.downloadURL || data?.url;
        if (!videoUrl) throw new Error(data?.error || data?.message || 'No download URL');

        await sock.sendMessage(from, {
          video: { url: videoUrl },
          caption: `✅ *${info.title}*\n\n> KLAUS XMD`,
          mimetype: 'video/mp4'
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Download failed: ${e.message}`);
      }
    }
  },

  /* ============ 🎵 PLAY / YTMP3 ============ */
  {
    command: 'play',
    aliases: ['ytmp3', 'song', 'audio'],
    description: 'Search & download YouTube audio',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text) return reply('🎵 Example: .play faded alan walker');

      await reply('🔍 *Searching...*');
      try {
        // 1. Search
        const { data: search } = await axios.get(
          api(`/api/music/ytmp3-net-search?q=${encodeURIComponent(text)}&provider=ytmp3`),
          { timeout: 30000 }
        );

        const results = search?.result || search?.results || search?.data;
        const first = Array.isArray(results) ? results[0] : results;
        if (!first) throw new Error('No results');

        const videoId = first.videoId || first.id || first.video_id;
        const title = first.title || first.name || text;
        const thumb = first.thumbnail || first.thumb || first.image || first.cover;

        if (!videoId) throw new Error('No video ID in result');

        await reply(`🎵 *${title}*\n_Downloading audio..._`);

        // 2. Download
        const { data: dl } = await axios.get(
          api(`/api/music/ytmp4-download?id=${videoId}&quality=audio&provider=ytmp4`),
          { timeout: 60000 }
        );

        const audioUrl = dl?.result?.download_url || dl?.result?.url || dl?.downloadURL || dl?.url;
        if (!audioUrl) throw new Error(dl?.error || 'No audio URL');

        if (thumb) {
          await sock.sendMessage(from, {
            image: { url: thumb },
            caption: `🎵 *${title}*`
          }, { quoted: msg });
        }
        await sock.sendMessage(from, {
          audio: { url: audioUrl },
          mimetype: 'audio/mp4',
          fileName: `${title}.mp3`
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  }
];