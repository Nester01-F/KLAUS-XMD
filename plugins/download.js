const yts = require('yt-search');
const axios = require('axios');

const API = 'https://prexzyapis.com';
const api = (path) => `${API}${path}`;

module.exports = [
  /* ═══════════════════════════════════════════════════════════
     🎬 YTMP4
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'ytmp4',
    aliases: ['ytvideo'],
    description: 'YouTube video downloader',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text) return reply('🎬 Example: .ytmp4 https://youtu.be/dQw4w9WgXcQ');
      const id = text.match(/(?:youtu\.be\/|v=)([\w-]{11})/)?.[1] || text.trim();
      if (!/^[\w-]{11}$/.test(id)) return reply('❌ Invalid YouTube ID.');

      let info;
      try { info = await yts({ videoId: id }); }
      catch { return reply('❌ Could not fetch video info.'); }

      await sock.sendMessage(from, {
        image: { url: info.thumbnail },
        caption: `🎬 *${info.title}*\n⏱️ ${info.timestamp}\n\n_Processing..._`
      }, { quoted: msg });

      try {
        const url = `https://youtube.com/watch?v=${id}`;
        const { data } = await axios.get(
          api(`/download/ytmp4?url=${encodeURIComponent(url)}`),
          { timeout: 60000 }
        );
        const videoUrl = data?.download_url || data?.url || data?.result?.url || data?.result?.download_url || data?.data?.url;
        if (!videoUrl) throw new Error(data?.error || data?.message || 'No video URL');

        await sock.sendMessage(from, {
          video: { url: videoUrl },
          caption: `✅ *${info.title}*\n\n> KLAUS XMD`,
          mimetype: 'video/mp4'
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     🎵 PLAY / YTMP3
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'play',
    aliases: ['ytmp3', 'song', 'audio'],
    description: 'YouTube audio downloader',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text) return reply('🎵 Example: .play faded');

      let info;
      try {
        const { videos } = await yts(text);
        info = videos[0];
      } catch { return reply('❌ Search failed.'); }
      if (!info) return reply('❌ Not found.');

      await sock.sendMessage(from, {
        image: { url: info.thumbnail },
        caption: `🎧 *${info.title}*\n⏱️ ${info.timestamp}\n👤 ${info.author.name}\n\n_Generating audio..._`
      }, { quoted: msg });

      try {
        const { data } = await axios.get(
          api(`/download/ytmp3?url=${encodeURIComponent(info.url)}`),
          { timeout: 60000 }
        );
        const audioUrl = data?.download_url || data?.url || data?.result?.url || data?.result?.download_url || data?.data?.url;
        if (!audioUrl) throw new Error(data?.error || 'No audio URL');

        await sock.sendMessage(from, {
          audio: { url: audioUrl },
          mimetype: 'audio/mp4',
          fileName: `${info.title}.mp3`
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     🎵 TIKTOK
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'tiktok',
    aliases: ['tt'],
    description: 'Download TikTok',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text.includes('tiktok.com')) return reply('📱 Send a TikTok link.');

      await reply('🎵 *Fetching TikTok...*');
      try {
        const { data } = await axios.get(
          api(`/download/tiktok?url=${encodeURIComponent(text)}`),
          { timeout: 30000 }
        );

        const video = data?.video || data?.play || data?.url || data?.result?.video || data?.result?.play;
        const title = data?.title || data?.result?.title || 'TikTok';
        const cover = data?.cover || data?.thumbnail || data?.result?.cover;

        if (!video) throw new Error(data?.error || 'No video URL');

        if (cover) {
          await sock.sendMessage(from, { image: { url: cover }, caption: `🎵 *${title}*` }, { quoted: msg });
        }
        await sock.sendMessage(from, {
          video: { url: video },
          caption: `🎵 ${title}\n\n> KLAUS XMD`
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     📘 FACEBOOK
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'fb',
    aliases: ['facebook'],
    description: 'Download Facebook video',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text.includes('facebook.com')) return reply('📘 Send a Facebook link.');

      await reply('📘 *Fetching Facebook video...*');
      try {
        const { data } = await axios.get(
          api(`/download/facebook?url=${encodeURIComponent(text)}`),
          { timeout: 30000 }
        );

        const video = data?.hd || data?.sd || data?.url || data?.video || data?.result?.hd || data?.result?.sd;
        if (!video) throw new Error(data?.error || 'No video URL');

        await sock.sendMessage(from, {
          video: { url: video },
          caption: `📘 KLAUS XMD`
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     🎧 SPOTIFY
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'spotify',
    aliases: ['sp'],
    description: 'Download Spotify track',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text.includes('spotify.com')) return reply('🎧 Send a Spotify link.');

      await reply('🎧 *Downloading from Spotify...*');
      try {
        const { data } = await axios.get(
          api(`/download/spotify?url=${encodeURIComponent(text)}`),
          { timeout: 30000 }
        );

        const audioUrl = data?.download_url || data?.url || data?.result?.url || data?.data?.url;
        const title = data?.title || data?.result?.title || 'Spotify Track';
        const artist = data?.artist || data?.result?.artist || '';
        const thumb = data?.thumbnail || data?.result?.thumbnail || data?.cover;

        if (!audioUrl) throw new Error(data?.error || 'No audio URL');

        if (thumb) {
          await sock.sendMessage(from, {
            image: { url: thumb },
            caption: `🎧 *${title}*\n👤 ${artist}`
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