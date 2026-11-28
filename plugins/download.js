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

// What the user sees in chat (full details are in the console log)
function failText(e) {
  if (/bot-check/.test(e.message)) {
    return '❌ YouTube is blocking this bot\'s server right now. The owner needs to add cookies or a proxy (see the logs).';
  }
  return `❌ Failed: ${e.message.slice(0, 300)}`;
}

// "Faded (Official Video) [HD]" -> "Faded"
const cleanTitle = (t = '') => t.replace(/[\(\[][^)\]]*[\)\]]/g, ' ').replace(/\s+/g, ' ').trim() || t;

// Pick a WhatsApp-friendly mimetype from the file's first bytes
function sniffAudioMime(buf) {
  if (buf.slice(0, 3).toString() === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  if (buf.slice(0, 4).toString() === 'OggS') return 'audio/ogg; codecs=opus';
  return 'audio/mp4';
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
  // Optional: YouTube cookies (logged-in session), a proxy, or extra yt-dlp flags
  const cookieFile = [process.env.YTDLP_COOKIES, path.join(__dirname, '..', 'cookies.txt')]
    .filter(Boolean).find((f) => fs.existsSync(f));
  const cookieB64 = process.env.YTDLP_COOKIES_B64; // for hosts where you can't upload files
  const haveCookies = !!(cookieB64 || cookieFile);
  if (haveCookies) {
    const copy = path.join(dir, 'cookies.txt'); // yt-dlp rewrites its cookie file, so give it a throwaway copy
    if (cookieB64) fs.writeFileSync(copy, Buffer.from(cookieB64, 'base64'));
    else fs.copyFileSync(cookieFile, copy);
    base.push('--cookies', copy);
  }
  if (process.env.YTDLP_PROXY) base.push('--proxy', process.env.YTDLP_PROXY);
  if (process.env.YTDLP_ARGS) base.push(...process.env.YTDLP_ARGS.split(/\s+/).filter(Boolean));

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
      .filter((f) => f !== 'cookies.txt' && !/\.(part|ytdl|temp)$/.test(f))
      .map((f) => path.join(dir, f))
      .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
    if (!files.length) throw new Error('no output file');
    return fs.readFileSync(files[0]);
  } catch (e) {
    const raw = String(e.stderr || e.message);
    if (/confirm you.?re not a bot|sign in to confirm/i.test(raw)) {
      throw new Error(`yt-dlp: bot-check, YouTube blocked this server's IP${haveCookies ? ' (cookies may be expired)' : ' (needs cookies.txt or a proxy)'}`);
    }
    const errLine = raw.split('\n').find((l) => /^ERROR/i.test(l.trim())) || raw.trim().split('\n').slice(-2).join(' ');
    throw new Error(`yt-dlp: ${errLine.trim().slice(0, 220)}`);
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
  if (typeof ytdl !== 'function') throw new Error(`ytdl-core: unsupported export (${Object.keys(mod || {}).slice(0, 5).join(',') || typeof mod}); remove the package`);

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

/* ── YouTube: yt-dlp → API → SoundCloud (audio only) → ytdl-core ── */
// yt-dlp goes first: the API's googlevideo links are tied to the API server's IP, so downloading them from here 403s.
// If YouTube blocks this server (bot-check), audio requests fall back to a SoundCloud search of the same title.
async function getYouTubeMedia(url, kind, query) {
  const stages = [
    () => viaYtDlp(url, kind),
    async () => {
      const data = await apiGet(`/download/${kind === 'audio' ? 'ytmp3' : 'ytmp4'}?url=${encodeURIComponent(url)}`);
      const mediaUrl = pickUrl(data);
      if (!mediaUrl) throw new Error(`API: no URL (${data?.error || 'empty response'})`);
      return downloadBuffer(mediaUrl, 120000);
    }
  ];
  if (kind === 'audio' && query) {
    stages.push(async () => ({
      buf: await viaYtDlp(`scsearch1:${cleanTitle(query)}`, 'audio'),
      source: 'soundcloud'
    }));
  }
  stages.push(() => viaYtdlCore(url, kind));
  return runStages(stages, kind === 'audio' ? 5000 : 10000); // -> { buf, source? }
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
      return (await getYouTubeMedia(videos[0].url, 'audio', o.title)).buf;
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
        const { buf } = await getYouTubeMedia(`https://youtube.com/watch?v=${id}`, 'video');
        await sock.sendMessage(from, {
          video: buf,
          caption: `✅ *${info.title}*\n\n> KLAUS XMD`,
          mimetype: 'video/mp4'
        }, { quoted: msg });
      } catch (e) {
        console.error('[ytmp4]', e.message);
        reply(failText(e));
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
        const { buf, source } = await getYouTubeMedia(info.url, 'audio', info.title);
        if (source === 'soundcloud') {
          await reply('ℹ️ YouTube is blocking this server, so this is the SoundCloud version of the song.');
        }
        await sock.sendMessage(from, {
          audio: buf,
          mimetype: sniffAudioMime(buf),
          fileName: `${info.title}.mp3`
        }, { quoted: msg });
      } catch (e) {
        console.error('[play]', e.message);
        reply(failText(e));
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
        reply(failText(e));
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
        reply(failText(e));
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
          mimetype: sniffAudioMime(r.buf),
          fileName: `${title}.mp3`
        }, { quoted: msg });
      } catch (e) {
        console.error('[spotify]', e.message);
        reply(failText(e));
      }
    }
  }
];