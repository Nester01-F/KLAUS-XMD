/**
 * KLAUS XMD: more downloaders (no API keys, no axios)
 * Save as plugins/download-more.js (replaces your old file)
 *
 *   .twitter <link>  (.x)    FxTwitter API, falls back to VxTwitter
 *   .pinterest <link> (.pin) reads the public pin page itself (no third-party API)
 *   .lyrics2 <song>  (.song) iTunes search
 */

const { panel } = require('../lib/ui');

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/* ---------- helpers ---------- */
async function request(url, { json = false, method = 'GET', headers = {}, timeout = 12000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { method, headers, redirect: 'follow', signal: ctrl.signal });
    if (!res.ok) {
      const err = new Error('HTTP ' + res.status);
      err.status = res.status;
      throw err;
    }
    if (method === 'HEAD') return true;
    return json ? await res.json() : await res.text();
  } finally {
    clearTimeout(timer);
  }
}

const firstUrl = text => (String(text || '').match(/https?:\/\/[^\s]+/) || [])[0] || '';
const trim = (s, n) => {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};
const decodeHtml = s =>
  String(s || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/* ---------- Twitter / X ---------- */
const TWEET_RE = /(?:twitter|x|fxtwitter|vxtwitter|fixupx|mobile\.twitter)\.com\/([^/\s?]+)\/status\/(\d+)/i;

// Each provider returns { text, author, handle, media: [{ type: 'video'|'gif'|'image', url }] }
const TWEET_PROVIDERS = [
  {
    name: 'fxtwitter',
    async fetch(user, id) {
      const d = await request(`https://api.fxtwitter.com/${user}/status/${id}`, { json: true });
      const t = d.tweet;
      if (!t) throw new Error('no tweet in response');
      const media = [
        ...(t.media?.videos || []).map(v => ({ type: v.type === 'gif' ? 'gif' : 'video', url: v.url })),
        ...(t.media?.photos || []).map(p => ({ type: 'image', url: p.url }))
      ];
      return { text: t.text, author: t.author?.name, handle: t.author?.screen_name, media };
    }
  },
  {
    name: 'vxtwitter',
    async fetch(user, id) {
      const d = await request(`https://api.vxtwitter.com/${user}/status/${id}`, { json: true });
      const media = (d.media_extended || []).map(m => ({
        type: m.type === 'video' ? 'video' : m.type === 'gif' ? 'gif' : 'image',
        url: m.url
      }));
      return { text: d.text, author: d.user_name, handle: d.user_screen_name, media };
    }
  }
];

async function getTweet(user, id, logger) {
  let lastErr;
  for (const p of TWEET_PROVIDERS) {
    try {
      const t = await p.fetch(user, id);
      if (t && (t.media.length || t.text)) return t;
    } catch (e) {
      lastErr = e;
      logger?.warn?.(`twitter provider ${p.name} failed: ${e.message}`);
    }
  }
  throw lastErr || new Error('no provider returned data');
}

/* ---------- Pinterest ---------- */
function metaTag(html, prop) {
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
  const b = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i');
  const m = html.match(a) || html.match(b);
  return m ? decodeHtml(m[1]) : null;
}

async function readPin(url) {
  const html = await request(url, {
    headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'en-US,en;q=0.9' }
  });

  // Video pins: direct mp4 links are embedded in the page (slashes may be escaped as \/)
  const clean = html.replace(/\\u002F/gi, '/').replace(/\\\//g, '/');
  const mp4s = [...new Set(clean.match(/https:\/\/v\d*\.pinimg\.com\/videos\/[^"'\s<>\\]+?\.mp4/g) || [])];
  const video = mp4s.find(u => /720p/.test(u)) || mp4s[0] || null;

  // Image: the og:image is a small version, so try the original-size path first
  let image = metaTag(html, 'og:image');
  if (image && /\/(236x|474x|564x|736x)\//.test(image)) {
    const original = image.replace(/\/(236x|474x|564x|736x)\//, '/originals/');
    try {
      await request(original, { method: 'HEAD', timeout: 8000 });
      image = original;
    } catch { /* keep the smaller version */ }
  }

  return { video, image, title: metaTag(html, 'og:title') };
}

/* ---------- commands ---------- */
module.exports = [
  {
    command: 'twitter',
    aliases: ['x'],
    description: 'Download Twitter/X video or images',
    category: 'download',
    async run({ reply, text, sock, from, msg, config, logger }) {
      const link = firstUrl(text);
      const m = link.match(TWEET_RE);
      if (!m) return reply(`🐦 Send a Twitter/X post link.\nExample: ${config.prefix}twitter https://x.com/user/status/123456`);

      let tweet;
      try {
        tweet = await getTweet(m[1], m[2], logger);
      } catch {
        return reply('❌ Could not read that post. It may be private or deleted, or the service is busy. Try again in a minute.');
      }

      const who = tweet.handle ? `*@${tweet.handle}*${tweet.author ? ` (${tweet.author})` : ''}\n` : '';
      const caption = `🐦 ${who}${trim(tweet.text, 350)}\n\n_⚡ ${config.botName}_`;

      if (!tweet.media.length) return reply(caption + '\n\n_(This post has no photo or video.)_');

      try {
        const video = tweet.media.find(x => x.type === 'video' || x.type === 'gif');
        if (video) {
          await sock.sendMessage(
            from,
            { video: { url: video.url }, caption, gifPlayback: video.type === 'gif' },
            { quoted: msg }
          );
          return;
        }
        const images = tweet.media.filter(x => x.type === 'image').slice(0, 4);
        for (let i = 0; i < images.length; i++) {
          await sock.sendMessage(from, { image: { url: images[i].url }, caption: i === 0 ? caption : undefined }, { quoted: msg });
        }
      } catch (e) {
        logger?.error?.('twitter send failed: ' + e.message);
        await reply('❌ Found the media but could not send it. Try again in a moment.');
      }
    }
  },

  {
    command: 'pinterest',
    aliases: ['pin'],
    description: 'Download a Pinterest image or video',
    category: 'download',
    async run({ reply, text, sock, from, msg, config, logger }) {
      const link = firstUrl(text);
      if (!/pinterest\.[a-z.]+\/pin\/|pin\.it\//i.test(link)) {
        return reply(`📌 Send a Pinterest pin link.\nExample: ${config.prefix}pinterest https://pin.it/xxxx`);
      }

      let pin;
      try {
        pin = await readPin(link);
      } catch {
        return reply('❌ Could not open that pin. Check the link, or try again in a minute.');
      }
      if (!pin.video && !pin.image) {
        return reply('❌ Could not find any media in that pin. It may be private, removed, or Pinterest blocked the request.');
      }

      const caption = `📌 ${pin.title ? trim(decodeHtml(pin.title), 150) + '\n\n' : ''}_⚡ ${config.botName}_`;
      try {
        if (pin.video) await sock.sendMessage(from, { video: { url: pin.video }, caption }, { quoted: msg });
        else await sock.sendMessage(from, { image: { url: pin.image }, caption }, { quoted: msg });
      } catch (e) {
        logger?.error?.('pinterest send failed: ' + e.message);
        await reply('❌ Found the media but could not send it. Try again in a moment.');
      }
    }
  },

  {
    command: 'lyrics2',
    aliases: ['song'],
    description: 'Search a song (iTunes)',
    category: 'download',
    async run({ reply, text, config }) {
      if (!text) return reply(`🎵 Example: ${config.prefix}song faded`);
      let d;
      try {
        d = await request(
          `https://itunes.apple.com/search?term=${encodeURIComponent(text)}&media=music&entity=song&limit=1`,
          { json: true }
        );
      } catch {
        return reply('❌ Could not reach the music service. Try again in a moment.');
      }
      const t = d.results?.[0];
      if (!t) return reply('❌ Not found.');
      await reply(panel(`🎵 ${t.trackName}`, [
        ['👤 Artist', t.artistName],
        t.collectionName ? ['💿 Album', t.collectionName] : null,
        t.primaryGenreName ? ['🎼 Genre', t.primaryGenreName] : null,
        t.trackViewUrl ? ['🔗 Link', t.trackViewUrl] : null
      ]));
    }
  }
];