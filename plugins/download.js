const yts = require('yt-search');
const axios = require('axios');
const { execFile } = require('child_process');

const API = 'https://prexzyapis.com';
const API_KEY = process.env.PREXZY_APIKEY || ''; // only if the provider gives you a key
const MAX_BYTES = 100 * 1024 * 1024;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/* ── Helpers ────────────────────────────────────────────────── */
const pickUrl = (d) =>
  d?.download_url || d?.url || d?.result?.download_url || d?.result?.url || d?.data?.url || d?.data?.download_url;

const refererFor = (url) => {
  const h = new URL(url).hostname;
  if (/tiktok|byte|tikwm/.test(h)) return 'https://www.tiktok.com/';
  if (/fbcdn|facebook/.test(h)) return 'https://www.facebook.com/';
  if (/googlevideo|youtube/.test(h)) return 'https://www.youtube.com/';
};

async function getJson(url, timeout = 30000) {
  try {
    const res = await axios.get(url, { timeout, headers: { 'User-Agent': UA, Accept: 'application/json' } });
    return res.data;
  } catch (e) {
    const body = typeof e.response?.data === 'string' ? e.response.data : JSON.stringify(e.response?.data || '');
    throw new Error(`${new URL(url).hostname} ${e.response?.status || e.code} ${body.replace(/\s+/g, ' ').slice(0, 120)}`);
  }
}

// Calls the main API (adds your key if PREXZY_APIKEY is set)
function apiGet(path, timeout = 60000) {
  const sep = path.includes('?') ? '&' : '?';
  return getJson(`${API}${path}${API_KEY ? `${sep}apikey=${encodeURIComponent(API_KEY)}` : ''}`, timeout);
}

async function downloadBuffer(url, timeout = 60000) {
  const headers = { 'User-Agent': UA, Accept: '*/*' };
  const ref = refererFor(url);
  if (ref) headers.Referer = ref;
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout, maxContentLength: MAX_BYTES, headers });
    return Buffer.from(res.data);
  } catch (e) {
    throw new Error(`Download ${e.response?.status || e.code} from ${new URL(url).hostname}`);
  }
}

// Thumbnails must never kill a download
async function trySendImage(sock, from, url, caption, msg) {
  if (!url) return;
  try {
    await sock.sendMessage(from, { image: { url }, caption }, { quoted: msg });
  } catch {
    try { await sock.sendMessage(from, { text: caption }, { quoted: msg }); } catch {}
  }
}

/* Tries each stage in order; the first one returning a real file wins */
async function runStages(stages, minSize = 10000) {
  const errors = [];
  for (const stage of stages) {
    try {
      const r = await stage();
      const out = Buffer.isBuffer(r) ? { buf: r } : r;
      if (out?.buf && out.buf.length >= minSize) return out;
      errors.push('file too small');
    } catch (e) {
      errors.push(e.message);
    }
  }
  throw new Error(errors.join(' | '));
}

/* ── Local downloaders (run from the bot's own IP) ──────────── */
function viaYtDlp(url, kind) {
  const args = kind === 'audio'
    ? ['-f', 'bestaudio[ext=m4a]/bestaudio', '--no-playlist', '-o', '-', url]
    : ['-f', 'best[ext=mp4][height<=720]/best[ext=mp4]/best', '--no-playlist', '-o', '-', url];

  return new Promise((resolve, reject) => {
    execFile('yt-dlp', args, { encoding: 'buffer', maxBuffer: MAX_BYTES, timeout: 180000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`yt-dlp: ${(stderr?.toString() || err.message).trim().slice(-150)}`));
      resolve(Buffer.from(stdout));
    });
  });
}

async function viaYtdlCore(url, kind) {
  let ytdl;
  try { ytdl = require('@distube/ytdl-core'); }
  catch { throw new Error('ytdl-core: not installed'); }

  const stream = ytdl(url, kind === 'audio'
    ? { filter: 'audioonly', quality: 'highestaudio' }
    : { filter: (f) => f.container === 'mp4' && f.hasVideo && f.hasAudio, quality: 'highest' });

  const chunks = [];
  let size = 0;
  for await (const c of stream) {
    size += c.length;
    if (size > MAX_BYTES) { stream.destroy(); throw new Error('ytdl-core: file too large'); }
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

/* ── YouTube: API → yt-dlp → ytdl-core ──────────────────────── */
async function getYouTubeMedia(url, kind) {
  const { buf } = await runStages([
    async () => {
      const data = await apiGet(`/download/${kind === 'audio' ? 'ytmp3' : 'ytmp4'}?url=${encodeURIComponent(url)}`);
      const mediaUrl = pickUrl(data);
      if (!mediaUrl) throw new Error(`API: no URL (${data?.error || 'empty response'})`);
      return downloadBuffer(mediaUrl, 120000);
    },
    () => viaYtDlp(url, kind),
    () => viaYtdlCore(url, kind)
  ], kind === 'audio' ? 5000 : 10000);
  return buf;
}

/* ── TikTok: API → tikwm → yt-dlp ───────────────────────────── */
async function getTikTok(url) {
  return runStages([
    async () => {
      const data = await apiGet(`/download/tiktok?url=${encodeURIComponent(url)}`);
      const video = data?.video || data?.play || data?.url || data?.result?.video || data?.result?.play;
      if (!video) throw new Error(`API: no URL (${data?.error || 'empty response'})`);
      return {
        buf: await downloadBuffer(video),
        title: data?.title || data?.result?.title,
        cover: data?.cover || data?.thumbnail || data?.result?.cover
      };
    },
    async () => {
      const d = (await getJson(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`))?.data;
      let video = d?.hdplay || d?.play;
      if (!video) throw new Error('tikwm: no URL');
      if (video.startsWith('/')) video = `https://www.tikwm.com${video}`;
      return { buf: await downloadBuffer(video), title: d?.title, cover: d?.cover };
    },
    async () => ({ buf: await viaYtDlp(url, 'video') })
  ]);
}

/* ── Facebook: API → yt-dlp ─────────────────────────────────── */
async function getFacebook(url) {
  const { buf } = await runStages([
    async () => {
      const data = await apiGet(`/download/facebook?url=${encodeURIComponent(url)}`);
      const video = data?.hd || data?.sd || data?.url || data?.video || data?.result?.hd || data?.result?.sd;
      if (!video) throw new Error(`API: no URL (${data?.error || 'empty response'})`);
      return downloadBuffer(video);
    },
    () => viaYtDlp(url, 'video')
  ]);
  return buf;
}

/* ── Spotify: API → YouTube match of the same song ──────────── */
async function getSpotify(url) {
  const meta = {};
  const { buf } = await runStages([
    async () => {
      const data = await apiGet(`/download/spotify?url=${encodeURIComponent(url)}`);
      const audioUrl = pickUrl(data);
      if (!audioUrl) throw new Error(`API: no URL (${data?.error || 'empty response'})`);
      meta.title = data?.title || data?.result?.title;
      meta.artist = data?.artist || data?.result?.artist;
      meta.thumb = data?.thumbnail || data?.result?.thumbnail || data?.cover;
      return downloadBuffer(audioUrl);
    },
    async () => {
      // Spotify's oEmbed is public: get the song title, then fetch that song's audio from YouTube
      const o = await getJson(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, 15000);
      if (!o?.title) throw new Error('spotify oEmbed: no title');
      const { videos } = await yts(`${o.title} audio`);
      if (!videos?.[0]) throw new Error('no YouTube match');
      meta.title = o.title;
      meta.thumb = o.thumbnail_url;
      return getYouTubeMedia(videos[0].url, 'audio');
    }
  ], 5000);
  return { buf, ...meta };
}

module.exports = [
  /* ═══ 🎬 YTMP4 ═══ */
  {
    command: 'ytmp4',
    aliases: ['ytvideo'],
    description: 'YouTube video downloader',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text) return reply('🎬 Example: .ytmp4 https://youtu.be/dQw4w9WgXcQ');
      const id = text.match(/(?:youtu\.be\/|v=|shorts\/)([\w-]{11})/)?.[1] || text.trim();
      if (!/^[\w-]{11}$/.test(id)) return reply('❌ Invalid YouTube ID.');

      let info;
      try { info = await yts({ videoId: id }); }
      catch { return reply('❌ Could not fetch video info.'); }

      await trySendImage(sock, from, info.thumbnail,
        `🎬 *${info.title}*\n⏱️ ${info.timestamp}\n\n_Downloading video..._`, msg);

      try {
        const buf = await getYouTubeMedia(`https://youtube.com/watch?v=${id}`, 'video');
        await sock.sendMessage(from, {
          video: buf,
          caption: `✅ *${info.title}*\n\n> KLAUS XMD`,
          mimetype: 'video/mp4'
        }, { quoted: msg });
      } catch (e) {
        console.error('[ytmp4]', e.message);
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══ 🎵 PLAY / YTMP3 ═══ */
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

      await trySendImage(sock, from, info.thumbnail,
        `🎧 *${info.title}*\n⏱️ ${info.timestamp}\n👤 ${info.author.name}\n\n_Downloading audio..._`, msg);

      try {
        const buf = await getYouTubeMedia(info.url, 'audio');
        await sock.sendMessage(from, {
          audio: buf,
          mimetype: 'audio/mp4',
          fileName: `${info.title}.mp3`
        }, { quoted: msg });
      } catch (e) {
        console.error('[play]', e.message);
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══ 🎵 TIKTOK ═══ */
  {
    command: 'tiktok',
    aliases: ['tt'],
    description: 'Download TikTok',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text?.includes('tiktok.com')) return reply('📱 Send a TikTok link.');

      await reply('🎵 *Fetching TikTok...*');
      try {
        const r = await getTikTok(text.trim());
        const title = r.title || 'TikTok';
        await trySendImage(sock, from, r.cover, `🎵 *${title}*`, msg);
        await sock.sendMessage(from, {
          video: r.buf,
          caption: `🎵 ${title}\n\n> KLAUS XMD`,
          mimetype: 'video/mp4'
        }, { quoted: msg });
      } catch (e) {
        console.error('[tiktok]', e.message);
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══ 📘 FACEBOOK ═══ */
  {
    command: 'fb',
    aliases: ['facebook'],
    description: 'Download Facebook video',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text?.match(/facebook\.com|fb\.watch/)) return reply('📘 Send a Facebook link.');

      await reply('📘 *Fetching Facebook video...*');
      try {
        const buf = await getFacebook(text.trim());
        await sock.sendMessage(from, {
          video: buf,
          caption: `📘 KLAUS XMD`,
          mimetype: 'video/mp4'
        }, { quoted: msg });
      } catch (e) {
        console.error('[fb]', e.message);
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══ 🎧 SPOTIFY ═══ */
  {
    command: 'spotify',
    aliases: ['sp'],
    description: 'Download Spotify track',
    category: 'download',
    async run({ reply, text, sock, from, msg }) {
      if (!text?.includes('spotify.com')) return reply('🎧 Send a Spotify link.');

      await reply('🎧 *Downloading from Spotify...*');
      try {
        const r = await getSpotify(text.trim());
        const title = r.title || 'Spotify Track';
        await trySendImage(sock, from, r.thumb,
          `🎧 *${title}*${r.artist ? `\n👤 ${r.artist}` : ''}`, msg);
        await sock.sendMessage(from, {
          audio: r.buf,
          mimetype: 'audio/mp4',
          fileName: `${title}.mp3`
        }, { quoted: msg });
      } catch (e) {
        console.error('[spotify]', e.message);
        reply(`❌ Failed: ${e.message}`);
      }
    }
  }
];