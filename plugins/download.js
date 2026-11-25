
const yts = require('yt-search');
const axios = require('axios');

const API = 'https://apix.wolvarex.com';
const KEY = process.env.WOLVAREX_KEY || 'wxa_f_2fca8d14eb';
const api = (path) => `${API}${path}${path.includes('?') ? '&' : '?'}key=${KEY}`;

module.exports = [
  /* ============ 🎬 YTMP4 ============ */
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
        const { data } = await axios.get(
          api(`/api/music/ytmp4-download?id=${id}&quality=480&provider=ytmp4`),
          { timeout: 60000 }
        );
        const videoUrl = data?.result?.download_url || data?.result?.url || data?.downloadURL || data?.url;
        if (!videoUrl) throw new Error(data?.error || 'No video URL');

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

  /* ============ 🎵 PLAY / YTMP3 ============ */
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
          api(`/api/music/ytmp4-download?id=${info.videoId}&quality=audio&provider=ytmp4`),
          { timeout: 60000 }
        );
        const audioUrl = data?.result?.download_url || data?.result?.url || data?.downloadURL || data?.url;
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

  /* ============ 🎵 TIKTOK ============ */
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
          api(`/api/download/tiktok/savetik?url=${encodeURIComponent(text)}`),
          { timeout: 30000 }
        );

        const video = data?.result?.video || data?.result?.play || data?.video || data?.play || data?.result?.downloadURL;
        const title = data?.result?.title || data?.title || 'TikTok';
        const cover = data?.result?.cover || data?.result?.thumbnail || data?.cover;

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

  /* ============ 🎧 SPOTIFY ============ */
  {
    command: 'spotify',
    aliases: ['sp'],
    description: 'Download Spotify track',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text.includes('spotify.com')) return reply('🎧 Send a Spotify link.');

      try {
        const trackName = text.split('/').pop().split('?')[0];
        const { data } = await axios.get(
          api(`/api/spotify/download?url=${encodeURIComponent(text)}&q=${encodeURIComponent(trackName)}`),
          { timeout: 30000 }
        );

        const audioUrl = data?.result?.download_url || data?.result?.url || data?.downloadURL || data?.url;
        const title = data?.result?.title || data?.title || 'Spotify';
        const artist = data?.result?.artist || data?.artist || '';
        const thumb = data?.result?.thumbnail || data?.thumbnail;

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