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

      let info;
      try { info = await yts({ videoId: id }); }
      catch { return reply('❌ Could not fetch video info.'); }

      await sock.sendMessage(from, {
        image: { url: info.thumbnail },
        caption: `🎬 *${info.title}*\n⏱️ ${info.timestamp}\n\n_Processing..._`
      }, { quoted: msg });

      // Try multiple APIs
      const apis = [
        `https://api.vevioz.com/api/button/mp4/${id}`,
        `https://co.wuk.sh/api/json`,
      ];

      try {
        // Use Cobalt API (free, no key)
        const { data } = await axios.post('https://co.wuk.sh/api/json', {
          url: `https://youtube.com/watch?v=${id}`,
          vQuality: '720',
          isAudioOnly: false
        }, {
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          timeout: 30000
        });

        const videoUrl = data.url || data.status?.url;
        if (!videoUrl) throw new Error('No download URL');

        await sock.sendMessage(from, {
          video: { url: videoUrl },
          caption: `✅ *${info.title}*`
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Download failed: ${e.message}\n\n_Try again later_`);
      }
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
        // Use Instagram direct API — works for public posts
        const { data } = await axios.get(
          `https://www.instagram.com/p/${text.match(/\/p\/([^/]+)/)?.[1] || ''}/?__a=1&__d=dis`,
          {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
          }
        ).catch(() => ({}));

        // Fallback: use instasupersave or similar
        const apiUrl = `https://api.instasupersave.com/api/convert`;
        const { data: result } = await axios.post(apiUrl, {
          url: text
        }, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json'
          },
          timeout: 30000
        });

        const media = result?.url || result?.media || result?.data;
        if (!media) return reply('❌ Could not fetch media. Instagram may require login for this post.');

        const mediaList = Array.isArray(media) ? media : [media];
        for (const item of mediaList.slice(0, 5)) {
          const url = typeof item === 'string' ? item : (item.url || item.src);
          if (!url) continue;
          const isVideo = url.includes('.mp4') || url.includes('video');
          await sock.sendMessage(from, isVideo
            ? { video: { url }, caption: '📸 KLAUS XMD' }
            : { image: { url }, caption: '📸 KLAUS XMD' }, { quoted: msg });
        }
      } catch (e) {
        reply(`❌ Download failed: ${e.message}\n\n_Instagram may block this link_`);
      }
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
        // Use Snapsave or similar public API
        const { data } = await axios.post(
          'https://snapsave.app/action.php',
          new URLSearchParams({ url: text }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0',
              'Referer': 'https://snapsave.app/'
            },
            timeout: 30000
          }
        );

        // Parse the HTML response for video URL
        const videoMatch = data.match(/href="(https:\/\/[^"]*?\.mp4[^"]*)"/);
        if (!videoMatch) throw new Error('No video URL found');

        await sock.sendMessage(from, {
          video: { url: videoMatch[1] },
          caption: '📘 KLAUS XMD'
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Download failed: ${e.message}\n\n_Try a different FB link_`);
      }
    }
  },
  {
    command: 'spotify',
    description: 'Spotify track download',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text.includes('spotify.com')) return reply('🎵 Send a Spotify link.');

      try {
        // Use spotdl API
        const trackId = text.match(/track\/([a-zA-Z0-9]+)/)?.[1];
        if (!trackId) return reply('❌ Invalid Spotify link.');

        // Get metadata from Spotify's public API
        const { data: meta } = await axios.get(
          `https://api.spotifydown.com/metadata/track/${trackId}`,
          {
            headers: {
              'Origin': 'https://spotifydown.com',
              'Referer': 'https://spotifydown.com/',
              'User-Agent': 'Mozilla/5.0'
            },
            timeout: 15000
          }
        );

        if (!meta.success) throw new Error('Track not found');

        await sock.sendMessage(from, {
          image: { url: meta.metadata.cover },
          caption: `🎵 *${meta.metadata.title}*\n👤 ${meta.metadata.artists}`
        }, { quoted: msg });

        // Get download link
        const { data: dl } = await axios.get(
          `https://api.spotifydown.com/download/${trackId}`,
          {
            headers: {
              'Origin': 'https://spotifydown.com',
              'Referer': 'https://spotifydown.com/',
              'User-Agent': 'Mozilla/5.0'
            },
            timeout: 30000
          }
        );

        if (dl.success && dl.link) {
          await sock.sendMessage(from, {
            audio: { url: dl.link },
            mimetype: 'audio/mp4',
            fileName: `${meta.metadata.title}.mp3`
          }, { quoted: msg });
        } else {
          reply('❌ Audio download failed. Track may be unavailable.');
        }
      } catch (e) {
        reply(`❌ Download failed: ${e.message}`);
      }
    }
  }
];
