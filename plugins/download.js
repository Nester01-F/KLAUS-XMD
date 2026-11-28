const yts = require('yt-search');
const axios = require('axios');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

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
const BIN_DIR = path.join(__dirname, '..', 'bin');

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    execFile(cmd, args, { encoding: 'utf8', timeout: 20000, ...opts }, (err, stdout) =>
      err ? reject(err) : resolve(stdout));
  });

// Standalone yt-dlp builds (no Python needed)
const YTDLP_ASSET = (() => {
  const { platform, arch } = process;
  if (platform === 'win32') return 'yt-dlp.exe';
  if (platform === 'darwin') return 'yt-dlp_macos';
  if (platform === 'linux') return arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';
  return null;
})();

let ytDlpPromise = null;
let ytDlpFailedAt = 0;

/* Finds yt-dlp (YTDLP_PATH, PATH, ./bin) or downloads the standalone binary into ./bin once */
function ensureYtDlp() {
  if (Date.now() - ytDlpFailedAt < 10 * 60 * 1000) {
    return Promise.reject(new Error('yt-dlp unavailable (install failed recently, retrying in a few minutes)'));
  }
  if (!ytDlpPromise) {
    ytDlpPromise = (async () => {
      const local = path.join(BIN_DIR, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
      for (const c of [process.env.YTDLP_PATH, 'yt-dlp', local].filter(Boolean)) {
        try { await run(c, ['--version']); return c; } catch {}
      }
      if (!YTDLP_ASSET) throw new Error(`no standalone build for ${process.platform}/${process.arch}`);

      fs.mkdirSync(BIN_DIR, { recursive: true });
      const res = await axios.get(
        `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${YTDLP_ASSET}`,
        { responseType: 'arraybuffer', timeout: 180000, maxContentLength: 200 * 1024 * 1024, headers: { 'User-Agent': UA } }
      );
      const tmp = `${local}.download`;
      fs.writeFileSync(tmp, Buffer.from(res.data));
      fs.chmodSync(tmp, 0o755);
      fs.renameSync(tmp, local);
      await run(local, ['--version']); // sanity check that it actually runs here
      return local;
    })().catch((e) => {
      ytDlpPromise = null;
      ytDlpFailedAt = Date.now();
      throw new Error(`yt-dlp unavailable (${e.message})`);
    });
  }
  return ytDlpPromise;
}

let ffmpegPromise = null;
const hasFfmpeg = () => (ffmpegPromise ||= run('ffmpeg', ['-version']).then(() => true, () => false));

async function viaYtDlp(url, kind) {
  const bin = await ensureYtDlp();
  const ffmpeg = await hasFfmpeg();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klaus-dl-'));

  // Without ffmpeg we can only take single-file formats (video+audio already together)
  const format = kind === 'audio'
    ? 'ba[ext=m4a]/ba/b'
    : ffmpeg
      ? 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[ext=mp4][height<=720]/bv*[height<=720]+ba/b'
      : 'b[ext=mp4][height<=720]/b[ext=mp4]/b';

  const base = [
    '-f', format, '--no-playlist', '--no-warnings', '--max-filesize', '100M',
    ...(kind === 'video' && ffmpeg ? ['--merge-output-format', 'mp4'] : []),
    '-o', path.join(dir, 'out.%(ext)s')
  ];
  // Current yt-dlp needs a JS runtime for YouTube; this bot already has Node
  const withJs = [...base, '--js-runtimes', `node:${process.execPath}`, url];
  const withoutJs = [...base, url];
  const opts = { timeout: 180000, maxBuffer: 10 * 1024 * 1024 };

  try {
    try {
      await run(bin, withJs, opts);
    } catch (e) {
      // very old yt-dlp doesn't know --js-runtimes
      if (/no such option/i.test(String(e.stderr || e.message))) await run(bin, withoutJs, opts);
      else throw e;
    }

    const files = fs.readdirSync(dir)
      .filter((f) => !/\.(part|ytdl|temp)$/.test(f))
      .map((f) => path.join(dir, f))
      .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
    if (!files.length) throw new Error('no output file');
    return fs.readFileSync(files[0]);
  } catch (e) {
    const msg = String(e.stderr || e.message).trim().split('\n').slice(-2).join(' ').slice(-220);
    throw new Error(`yt-dlp: ${msg}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function viaYtdlCore(url, kind) {
  let mod;
  try { mod = require('@distube/ytdl-core'); }
  catch { throw new Error('ytdl-core: not installed'); }
  // Different versions export the function differently
  const ytdl = typeof mod === 'function' ? mod : (mod.default || mod.ytdl);
  if (typeof ytdl !== 'function') throw new Error('ytdl-core: unsupported export, update or remove the package');

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

/* ── YouTube: yt-dlp → API → ytdl-core ──────────────────────── */
// yt-dlp goes first: the API's googlevideo links are tied to the API server's IP, so downloading them from here 403s
async function getYouTubeMedia(url, kind) {
  const { buf } = await runStages([
    () => viaYtDlp(url, kind),
    async () => {
      const data = await apiGet(`/download/${kind === 'audio' ? 'ytmp3' : 'ytmp4'}?url=${encodeURIComponent(url)}`);
      const mediaUrl = pickUrl(data);
      if (!mediaUrl) throw new Error(`API: no URL (${data?.error || 'empty response'})`);
      return downloadBuffer(mediaUrl, 120000);
    },
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