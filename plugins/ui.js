const { getDB, getLeaderboard } = require('../lib/database');
const os = require('os');
const fs = require('fs');
const path = require('path');

/* ════════════════════════════════════════════════════════════
   0.  OPTIONAL IMAGE CARDS
   Install once:   npm i @napi-rs/canvas
   Without it the bot falls back to the text UI automatically.
   ════════════════════════════════════════════════════════════ */

let canvasLib = null;
try { canvasLib = require('@napi-rs/canvas'); } catch (_) { /* text-only mode */ }

const FONT_DIR = path.join(__dirname, '..', 'data', 'fonts');
const FONT_FILES = {
  KlausBold: ['Poppins-Bold.ttf',   'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf'],
  KlausMed:  ['Poppins-Medium.ttf', 'https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Medium.ttf']
};

async function fetchTimeout(url, ms) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { signal: ac.signal }); } finally { clearTimeout(timer); }
}

let fontsPromise = null;
function ensureFonts() {
  if (!canvasLib) return Promise.resolve(false);
  if (!fontsPromise) {
    fontsPromise = (async () => {
      try {
        fs.mkdirSync(FONT_DIR, { recursive: true });
        for (const [family, [file, url]] of Object.entries(FONT_FILES)) {
          const p = path.join(FONT_DIR, file);
          if (!fs.existsSync(p)) {
            const res = await fetchTimeout(url, 20000);
            if (!res.ok) throw new Error('font download failed');
            fs.writeFileSync(p, Buffer.from(await res.arrayBuffer()));
          }
          canvasLib.GlobalFonts.registerFromPath(p, family);
        }
        return true;
      } catch (_) { return false; }
    })();
  }
  return fontsPromise;
}

const bgCache = new Map();
async function loadBg(src) {
  if (!src || !canvasLib) return null;
  if (bgCache.has(src)) return bgCache.get(src);
  let img = null;
  try {
    let buf;
    if (/^https?:/i.test(src)) {
      const r = await fetchTimeout(src, 6000);
      if (!r.ok) throw new Error('bg');
      buf = Buffer.from(await r.arrayBuffer());
    } else {
      buf = fs.readFileSync(src);
    }
    img = await canvasLib.loadImage(buf);
  } catch (_) { /* no background image, gradient only */ }
  bgCache.set(src, img);
  return img;
}

const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function glow(c, x, y, r, color, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(color, a));
  g.addColorStop(1, hexA(color, 0));
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

const spacedW = (c, text, sp) => { let w = 0; for (const ch of text) w += c.measureText(ch).width + sp; return Math.max(0, w - sp); };
function spaced(c, text, x, y, sp) {
  let cx = x;
  for (const ch of text) { c.fillText(ch, cx, y); cx += c.measureText(ch).width + sp; }
}

/**
 * Render a 1200x675 dashboard card. Returns a JPEG Buffer or null.
 * spec: { tag, badge, title, raw, subtitle, chips:[[label,value]..4], bar:{left,right,pct}, footerL, footerR }
 */
async function renderCard(t, spec, bgSrc) {
  if (!canvasLib) return null;
  try {
    const fontsOk = await ensureFonts();
    if (!fontsOk && !canvasLib.GlobalFonts.families.length) return null;
    const P = t.palette;
    const B = fontsOk ? 'KlausBold' : 'sans-serif';
    const M = fontsOk ? 'KlausMed' : 'sans-serif';
    const CW = 1200, CH = 675, X0 = 70, XW = 1060;

    const canvas = canvasLib.createCanvas(CW, CH);
    const c = canvas.getContext('2d');

    /* background */
    const bg = c.createLinearGradient(0, 0, CW, CH);
    bg.addColorStop(0, P.bg1); bg.addColorStop(1, P.bg2);
    c.fillStyle = bg; c.fillRect(0, 0, CW, CH);

    const img = await loadBg(bgSrc);
    if (img) {
      const k = Math.max(CW / img.width, CH / img.height);
      const w = img.width * k, h = img.height * k;
      c.drawImage(img, (CW - w) / 2, (CH - h) / 2, w, h);
      const ov = c.createLinearGradient(0, 0, CW, CH);
      ov.addColorStop(0, hexA(P.bg1, 0.90)); ov.addColorStop(1, hexA(P.bg2, 0.82));
      c.fillStyle = ov; c.fillRect(0, 0, CW, CH);
    }

    glow(c, 1020, 70, 460, P.b, 0.30);
    glow(c, 90, 660, 420, P.a, 0.22);

    c.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 18; x < CW; x += 36) for (let y = 18; y < CH; y += 36) c.fillRect(x, y, 2, 2);

    /* frame */
    const fg = c.createLinearGradient(0, 0, CW, 0);
    fg.addColorStop(0, P.a); fg.addColorStop(1, P.b);
    c.strokeStyle = fg; c.lineWidth = 2; c.globalAlpha = 0.9;
    rr(c, 20, 20, CW - 40, CH - 40, 30); c.stroke();
    c.globalAlpha = 1;

    /* top row */
    c.textBaseline = 'alphabetic';
    c.font = `24px ${M}`;
    c.fillStyle = P.a; c.shadowColor = P.a; c.shadowBlur = 14;
    c.beginPath(); c.arc(X0 + 8, 80, 7, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0;
    spaced(c, String(spec.tag || '').toUpperCase(), X0 + 30, 89, 5);

    if (spec.badge) {
      c.font = `22px ${M}`; c.fillStyle = P.muted;
      const bw = spacedW(c, spec.badge, 1);
      spaced(c, spec.badge, X0 + XW - bw, 88, 1);
    }

    /* title */
    const title = spec.raw ? String(spec.title) : String(spec.title).toUpperCase();
    let size = 132, sp;
    for (; size > 44; size -= 4) {
      c.font = `${size}px ${B}`; sp = size * 0.07;
      if (spacedW(c, title, sp) <= XW) break;
    }
    const tw = spacedW(c, title, sp);
    const tg = c.createLinearGradient(X0, 0, X0 + Math.max(tw, 300), 0);
    tg.addColorStop(0, P.a); tg.addColorStop(1, P.b);
    c.fillStyle = tg; c.shadowColor = P.a; c.shadowBlur = 36;
    spaced(c, title, X0, 262, sp);
    c.shadowBlur = 0;

    /* subtitle + accent line */
    c.font = `30px ${M}`; c.fillStyle = P.text;
    spaced(c, String(spec.subtitle || '').toUpperCase(), X0, 322, 9);
    const lg = c.createLinearGradient(X0, 0, X0 + 180, 0);
    lg.addColorStop(0, P.a); lg.addColorStop(1, P.b);
    c.fillStyle = lg; rr(c, X0, 346, 180, 5, 2.5); c.fill();

    /* chips */
    const chips = (spec.chips || []).slice(0, 4);
    const gap = 20, n = Math.max(1, chips.length);
    const cw = (XW - gap * (n - 1)) / n, cy = 392, ch = 118;
    chips.forEach(([label, value], i) => {
      const x = X0 + i * (cw + gap);
      c.fillStyle = 'rgba(255,255,255,0.07)'; rr(c, x, cy, cw, ch, 20); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 1.5; rr(c, x, cy, cw, ch, 20); c.stroke();
      c.fillStyle = i % 2 ? P.b : P.a; rr(c, x + 18, cy + 22, 5, 74, 2.5); c.fill();

      c.font = `17px ${M}`; c.fillStyle = P.muted;
      spaced(c, String(label).toUpperCase(), x + 40, cy + 40, 3);

      let vs = 40;
      const val = String(value);
      for (; vs > 18; vs -= 2) { c.font = `${vs}px ${B}`; if (c.measureText(val).width <= cw - 62) break; }
      c.fillStyle = P.text; c.fillText(val, x + 40, cy + 92);
    });

    /* progress bar */
    if (spec.bar) {
      const by = 590;
      c.font = `20px ${M}`; c.fillStyle = P.text;
      spaced(c, String(spec.bar.left).toUpperCase(), X0, by - 18, 3);
      c.fillStyle = P.muted;
      const rw = spacedW(c, String(spec.bar.right), 1);
      spaced(c, String(spec.bar.right), X0 + XW - rw, by - 18, 1);

      c.fillStyle = 'rgba(255,255,255,0.10)'; rr(c, X0, by, XW, 16, 8); c.fill();
      const fw = Math.max(16, XW * Math.min(100, Math.max(0, spec.bar.pct)) / 100);
      const bgf = c.createLinearGradient(X0, 0, X0 + XW, 0);
      bgf.addColorStop(0, P.a); bgf.addColorStop(1, P.b);
      c.fillStyle = bgf; c.shadowColor = P.a; c.shadowBlur = 18;
      rr(c, X0, by, fw, 16, 8); c.fill();
      c.shadowBlur = 0;
    }

    /* footer */
    c.font = `18px ${M}`; c.fillStyle = P.muted;
    if (spec.footerL) spaced(c, spec.footerL, X0, 640, 1);
    if (spec.footerR) {
      const w = spacedW(c, spec.footerR, 1);
      spaced(c, spec.footerR, X0 + XW - w, 640, 1);
    }

    return canvas.toBuffer('image/jpeg', 92);
  } catch (_) {
    return null;
  }
}

/* ════════════════════════════════════════════════════════════
   1.  THEME ENGINE  (text UI, used for captions and fallbacks)
   Each user picks their own with  .theme neon | royal | hacker
   ════════════════════════════════════════════════════════════ */

const W = 30;

const mono   = (s) => '```' + s + '```';
const clip   = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
const center = (s, w = W) => {
  s = clip(s, w);
  const l = Math.floor((w - s.length) / 2);
  return ' '.repeat(l) + s + ' '.repeat(w - s.length - l);
};

const BLOCK = {
  A:['▄▀█','█▀█'], B:['█▄▄','█▄█'], C:['█▀▀','█▄▄'], D:['█▀▄','█▄▀'], E:['█▀▀','██▄'],
  F:['█▀▀','█▀ '], G:['█▀▀','█▄█'], H:['█ █','█▀█'], I:['█','█'],     J:['  █','█▄█'],
  K:['█▄▀','█ █'], L:['█  ','█▄▄'], M:['█▀▄▀█','█ ▀ █'], N:['█▄ █','█ ▀█'],
  O:['█▀█','█▄█'], P:['█▀█','█▀▀'], Q:['█▀█','▀▀█'], R:['█▀█','█▀▄'], S:['█▀▀','▄▄█'],
  T:['▀█▀',' █ '], U:['█ █','█▄█'], V:['█ █','▀▄▀'], W:['█ █ █','▀▄▀▄▀'],
  X:['▀▄▀','▄▀▄'], Y:['█▄█',' █ '], Z:['▀▀█','█▄▄'],
  0:['█▀█','█▄█'], 1:['▄█',' █'], 2:['▀█','█▄'], 3:['▀▀█','▄██'], 4:['█ █','▀▀█'],
  5:['█▀','▄█'], 6:['█▄▄','█▄█'], 7:['▀▀█','  █'], 8:['█▀█','█▀█'], 9:['█▀█','▀▀█'],
  '-':['▄▄ ','   ']
};

function bigText(str) {
  const words = String(str).toUpperCase().split(/\s+/).filter(Boolean);
  const out = [];
  for (const w of words) {
    const a = [], b = [];
    for (const ch of w) { const g = BLOCK[ch]; if (g) { a.push(g[0]); b.push(g[1]); } }
    const l1 = a.join(' '), l2 = b.join(' ');
    if (l1.length > W - 2) return null;
    out.push([l1, l2]);
  }
  return out;
}

const fancy = (s) => [...String(s)].map(c => {
  const k = c.codePointAt(0);
  if (k >= 65 && k <= 90)  return String.fromCodePoint(0x1D5D4 + k - 65);
  if (k >= 97 && k <= 122) return String.fromCodePoint(0x1D5EE + k - 97);
  if (k >= 48 && k <= 57)  return String.fromCodePoint(0x1D7EC + k - 48);
  return c;
}).join('');

const SC = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
const sc = (s) => String(s).toLowerCase().split('').map(c => SC[c] || c).join('');

const slug    = (config) => String(config.botName || 'bot').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const owner   = (config) => config.ownerName || 'Warrior Felix';
const repoUrl = (config) => config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
const repoShort = (config) => 'GitHub  ·  ' + repoUrl(config).replace(/^https?:\/\//, '');
const ghLine = (config) => `*GitHub*  ${repoUrl(config)}`;

/** Makes the image tappable: opens the GitHub repo and shows a link preview under it */
const linkCtx = (config, title, body, thumb) => ({
  externalAdReply: {
    title, body,
    thumbnailUrl: thumb,
    sourceUrl: repoUrl(config),
    mediaType: 1,
    renderLargerThumbnail: false
  }
});

const barOf = (on, off) => (pct, w = 10) => {
  const f = Math.max(0, Math.min(w, Math.round(pct / 100 * w)));
  return on.repeat(f) + off.repeat(w - f);
};

/* ---------- NEON ---------- */
const neon = {
  label: 'Neon · block-letter banner',
  palette: { a: '#00E5FF', b: '#FF2BD6', bg1: '#080B24', bg2: '#1B0A33', text: '#EEF4FF', muted: '#8C9CC8' },
  wrap: mono,
  banner(config, sub) {
    const big = bigText(config.botName || 'BOT');
    const lines = big
      ? big.flatMap(([a, b]) => [center(a), center(b)])
      : [center('░▒▓█ ' + String(config.botName).toUpperCase() + ' █▓▒░')];
    return [
      '╔' + '═'.repeat(W) + '╗',
      '║' + ' '.repeat(W) + '║',
      ...lines.map(l => '║' + l + '║'),
      '║' + ' '.repeat(W) + '║',
      '╠' + '═'.repeat(W) + '╣',
      '║' + center(sub || 'WhatsApp Bot') + '║',
      '╚' + '═'.repeat(W) + '╝'
    ].join('\n');
  },
  panel(title, rows) {
    const head = `─ ${title} `;
    const out = ['╭' + head + '─'.repeat(Math.max(0, W - head.length)) + '╮'];
    for (const r of rows) out.push('│ ' + clip(r, W - 2).padEnd(W - 2) + ' │');
    out.push('╰' + '─'.repeat(W) + '╯');
    return out.join('\n');
  },
  kv: (k, v) => `${k.padEnd(9)}: ${v}`,
  bar: barOf('█', '░'),
  cmdRows(prefix, names) {
    const cells = names.map(n => `▸ ${prefix}${n}`);
    const cols = Math.max(...cells.map(c => c.length)) <= 13 ? 2 : 1;
    const cw = Math.floor((W - 2) / cols);
    const rows = [];
    for (let i = 0; i < cells.length; i += cols) rows.push(cells.slice(i, i + cols).map(c => c.padEnd(cw)).join('').trimEnd());
    return rows;
  },
  cmdDetail: (prefix, n, d) => [`▸ ${prefix}${n}`, ...(d ? [`   ${clip(d, W - 5)}`] : [])],
  sig: (config) => `◆ ${config.botName} · © 2026 ${owner(config)}`
};

/* ---------- ROYAL ---------- */
const royal = {
  label: 'Royal · bold font, rails',
  palette: { a: '#FFD76A', b: '#C77DFF', bg1: '#12081F', bg2: '#2C1245', text: '#FFF6E0', muted: '#B9A5D6' },
  wrap: (s) => s,
  banner(config, sub) {
    return [
      '╭━━━━━━━━━━━━━━━━━━━━━━⊷',
      `┃  ◈  ${fancy(String(config.botName).toUpperCase())}  ◈`,
      `┃  ${sc(sub || 'whatsapp bot')}`,
      '╰━━━━━━━━━━━━━━━━━━━━━━⊷'
    ].join('\n');
  },
  panel(title, rows) {
    const out = [`╭━━〔 ${sc(title)} 〕━━⊷`];
    for (const r of rows) out.push(r.startsWith(' ') ? `┃ ${r}` : `┃ ❍ ${r}`);
    out.push('╰━━━━━━━━━━━━━━━━━⊷');
    return out.join('\n');
  },
  kv: (k, v) => `*${k}* ➜ ${v}`,
  bar: barOf('▰', '▱'),
  cmdRows(prefix, names) {
    const rows = [];
    for (let i = 0; i < names.length; i += 2) rows.push(names.slice(i, i + 2).map(n => `*${prefix}${n}*`).join('  ┊  '));
    return rows;
  },
  cmdDetail: (prefix, n, d) => [`*${prefix}${n}*`, ...(d ? [`   ↳ _${d}_`] : [])],
  sig: (config) => `> ◈ _${config.botName} · © 2026 ${owner(config)}_`
};

/* ---------- HACKER ---------- */
const hacker = {
  label: 'Hacker · terminal style',
  palette: { a: '#00FF9C', b: '#00B3FF', bg1: '#010906', bg2: '#05180F', text: '#D2FFE8', muted: '#5FAF8A' },
  wrap: mono,
  banner(config, sub) {
    const big = bigText(config.botName || 'BOT');
    const art = big ? big.flatMap(([a, b]) => [a, b]) : [String(config.botName).toUpperCase()];
    return [...art, '', `┌──(root@${slug(config)})-[~]`, `└─$ ${String(sub || 'run').toLowerCase()}`].join('\n');
  },
  panel(title, rows) {
    const out = [`┌─[ ${title} ]`];
    for (const r of rows) out.push('│ ' + r);
    out.push('└' + '─'.repeat(W - 2));
    return out.join('\n');
  },
  kv: (k, v) => `${k.toLowerCase().padEnd(9)}= ${v}`,
  bar: (pct, w = 10) => '[' + barOf('#', '-')(pct, w) + ']',
  cmdRows(prefix, names) {
    const cells = names.map(n => `${prefix}${n}`);
    const cols = Math.max(...cells.map(c => c.length)) <= 13 ? 2 : 1;
    const cw = Math.floor((W - 2) / cols);
    const rows = [];
    for (let i = 0; i < cells.length; i += cols) rows.push(cells.slice(i, i + cols).map(c => c.padEnd(cw)).join('').trimEnd());
    return rows;
  },
  cmdDetail: (prefix, n, d) => [`${prefix}${n}`, ...(d ? [`  # ${clip(d, W - 6)}`] : [])],
  sig: (config) => `$ exit   # © 2026 ${owner(config)}`
};

const THEMES = { neon, royal, hacker };

/* ---------- per-user theme (saved to disk) ---------- */
const THEME_FILE = path.join(__dirname, '..', 'data', 'themes.json');
let userThemes = {};
try { userThemes = JSON.parse(fs.readFileSync(THEME_FILE, 'utf8')); } catch (_) { /* first run */ }
function saveThemes() {
  try {
    fs.mkdirSync(path.dirname(THEME_FILE), { recursive: true });
    fs.writeFileSync(THEME_FILE, JSON.stringify(userThemes));
  } catch (_) { /* read-only host: memory only */ }
}
const getTheme = (config, sender) => THEMES[userThemes[sender]] || THEMES[config.theme] || THEMES.neon;

/* ════════════════════════════════════════════════════════════
   2.  DATA HELPERS
   ════════════════════════════════════════════════════════════ */

const CATEGORY_LABEL = {
  main: 'MAIN', download: 'DOWNLOADERS', sticker: 'STICKER', stickers: 'STICKER PACKS',
  ai: 'AI TOOLS', tools: 'TOOLS', fun: 'FUN', games: 'ARCADE', group: 'GROUP',
  admin: 'ADMIN', owner: 'OWNER', settings: 'SETTINGS', automation: 'AUTOMATION',
  text: 'TEXT', info: 'INFO', media: 'MEDIA', search: 'SEARCH', utility: 'UTILITY',
  leaderboard: 'LEADERBOARD', status: 'STATUS', other: 'OTHER'
};

const CATEGORY_ORDER = [
  'main', 'download', 'ai', 'sticker', 'stickers', 'games', 'fun', 'text', 'tools',
  'search', 'media', 'utility', 'info', 'status', 'leaderboard', 'group', 'admin',
  'settings', 'automation', 'owner', 'other'
];

const RANKS = [
  { min: 500, name: 'LEGEND' }, { min: 200, name: 'ELITE' }, { min: 100, name: 'PRO' },
  { min: 50, name: 'ACTIVE' },  { min: 10, name: 'REGULAR' }, { min: 0, name: 'NEWBIE' }
];

function rankInfo(n) {
  const i = RANKS.findIndex(r => n >= r.min);
  const cur = RANKS[i], next = RANKS[i - 1];
  return {
    name: cur.name,
    next: next ? next.name : null,
    need: next ? next.min - n : 0,
    pct: next ? ((n - cur.min) / (next.min - cur.min)) * 100 : 100
  };
}

function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m ${sec}s`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

const memMB  = () => (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
const ramPct = () => ((os.totalmem() - os.freemem()) / os.totalmem()) * 100;

function nowParts(tz) {
  const zone = tz || 'Africa/Nairobi';
  const d = new Date();
  const time = d.toLocaleTimeString('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('en-GB', { timeZone: zone, day: 'numeric', month: 'short' });
  const hour = parseInt(d.toLocaleString('en-GB', { timeZone: zone, hour: '2-digit', hour12: false }), 10);
  const greet = hour < 5 ? 'Late night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night';
  return { time, date, greet };
}

/** Send an image (URL string or Buffer) with caption, then an optional follow-up text. */
async function sendImage(sock, from, img, caption, extra, contextInfo) {
  await sock.sendMessage(from, {
    image: Buffer.isBuffer(img) ? img : { url: img },
    caption,
    ...(contextInfo ? { contextInfo } : {})
  });
  if (extra) await sock.sendMessage(from, { text: extra });
}

/* ════════════════════════════════════════════════════════════
   3.  PLUGINS
   ════════════════════════════════════════════════════════════ */

module.exports = [
  /* ============ MENU ============ */
  {
    command: 'menu',
    aliases: ['help', 'cmds', 'commands'],
    description: 'Show all commands',
    category: 'main',
    async run({ sock, from, sender, text, reply, config, plugins, pushName }) {
      const t = getTheme(config, sender);
      const cats = {};
      for (const [name, p] of plugins) {
        if (name === 'menu') continue;
        const c = p.category || 'other';
        (cats[c] = cats[c] || []).push(name);
      }

      const db = getDB();
      const lb = getLeaderboard();
      const myCmds = lb.commands[sender] || 0;
      const rank = rankInfo(myCmds);
      const uptime = fmtUptime(Date.now() - db.stats.startedAt);
      const { time, date, greet } = nowParts(config.timezone);

      /* ---- Drill-down: .menu ai ---- */
      if (text) {
        const cat = text.trim().toLowerCase();
        const list = (cats[cat] || []).sort();
        if (!list.length) {
          return reply(t.wrap(t.panel('UNKNOWN CATEGORY', [`"${clip(cat, 20)}" not found`, ...Object.keys(cats).sort().map(c => `${config.prefix}menu ${c}`)])));
        }
        const label = CATEGORY_LABEL[cat] || cat.toUpperCase();
        const rows = list.flatMap(c => t.cmdDetail(config.prefix, c, plugins.get(c)?.description));
        const card = await renderCard(t, {
          tag: 'CATEGORY', badge: `${time} · ${date}`,
          title: label, subtitle: `${list.length} commands available`,
          chips: [['COMMANDS', list.length], ['PREFIX', config.prefix], ['THEME', Object.keys(THEMES).find(k => THEMES[k] === t).toUpperCase()]],
          footerL: `© 2026 ${owner(config)}`, footerR: repoShort(config)
        }, config.images.menu);
        return sendImage(
          sock, from, card || config.images.menu,
          card ? `_${label} commands_\n${ghLine(config)}` : t.wrap(t.banner(config, `${label} · ${list.length} commands`)),
          t.wrap(t.panel(label, rows)) + '\n' + t.wrap(t.sig(config)),
          linkCtx(config, `${config.botName} · ${label}`, 'Tap to open GitHub', config.images.menu)
        );
      }

      /* ---- Full menu ---- */
      const card = await renderCard(t, {
        tag: 'COMMAND CENTER', badge: `${time} · ${date}`,
        title: config.botName, subtitle: `Welcome, ${pushName || 'friend'}`,
        chips: [
          ['COMMANDS', plugins.size], ['UPTIME', uptime],
          ['MEMORY', `${memMB()} MB`], ['PREFIX', config.prefix]
        ],
        bar: {
          left: `${rank.name}${rank.next ? '  >  ' + rank.next : ''}`,
          right: rank.next ? `${myCmds} used  ·  ${rank.need} to go` : `${myCmds} used  ·  max rank`,
          pct: rank.pct
        },
        footerL: `© 2026 ${owner(config)}`, footerR: repoShort(config)
      }, config.images.menu);

      const greeting = `_${greet}${pushName ? ', ' + pushName : ''}. Pick a command below._\n${ghLine(config)}`;
      const caption = card
        ? greeting
        : t.wrap(
            t.banner(config, 'COMMAND CENTER') + '\n\n' +
            t.panel('SYSTEM', [
              t.kv('Prefix', config.prefix), t.kv('Commands', plugins.size), t.kv('Uptime', uptime),
              t.kv('Memory', `${memMB()} MB`), t.kv('Time', `${time} · ${date}`)
            ]) + '\n' +
            t.panel('PROFILE', [
              t.kv('User', pushName || 'friend'), t.kv('Rank', rank.name), t.kv('Used', `${myCmds} cmds`),
              t.kv('Level', `${t.bar(rank.pct)} ${Math.round(rank.pct)}%`)
            ])
          ) + '\n' + greeting;

      const sorted = CATEGORY_ORDER.filter(c => cats[c]).concat(Object.keys(cats).filter(c => !CATEGORY_ORDER.includes(c)));
      const blocks = sorted.map(cat => {
        const list = cats[cat].sort();
        const label = CATEGORY_LABEL[cat] || cat.toUpperCase();
        return t.wrap(t.panel(`${label} [${list.length}]`, t.cmdRows(config.prefix, list)));
      });

      const body =
        blocks.join('\n') +
        `\n_${config.prefix}menu <category> for descriptions · ${config.prefix}theme to change style_\n` +
        t.wrap(t.sig(config));

      await sendImage(sock, from, card || config.images.menu, caption, body,
        linkCtx(config, `${config.botName} · Command Menu`, `${plugins.size} commands · Tap for GitHub`, config.images.menu));
    }
  },

  /* ============ THEME ============ */
  {
    command: 'theme',
    aliases: ['style', 'skin'],
    description: 'Change the look of the bot',
    category: 'settings',
    async run({ reply, sock, from, sender, text, config }) {
      const pick = (text || '').trim().toLowerCase();
      const current = userThemes[sender] || config.theme || 'neon';

      if (!THEMES[pick]) {
        const t = getTheme(config, sender);
        const rows = Object.entries(THEMES).map(([k, v]) => `${k === current ? '●' : '○'} ${k.padEnd(7)} ${clip(v.label.split('·')[1].trim(), 18)}`);
        return reply(t.wrap(t.panel('THEMES', rows)) + `\n_Use_ \`${config.prefix}theme neon\` _/_ \`royal\` _/_ \`hacker\``);
      }

      userThemes[sender] = pick;
      saveThemes();
      const t = THEMES[pick];
      const card = await renderCard(t, {
        tag: 'THEME SAVED', title: pick, subtitle: t.label.split('·')[1].trim(),
        chips: [['STYLE', pick.toUpperCase()], ['PREFIX', config.prefix]],
        footerL: `© 2026 ${owner(config)}`, footerR: `${config.prefix}menu to preview`
      }, config.images.menu);
      if (card) return sendImage(sock, from, card, `_Saved. Send ${config.prefix}menu to see it._`);
      await reply(t.wrap(t.banner(config, `THEME · ${pick.toUpperCase()}`)) + `\n_Saved. Send ${config.prefix}menu to see it._`);
    }
  },

  /* ============ ALIVE ============ */
  {
    command: 'alive',
    aliases: ['status'],
    description: 'Check bot status',
    category: 'main',
    async run({ sock, from, config, plugins, sender, pushName }) {
      const t = getTheme(config, sender);
      const db = getDB();
      const lb = getLeaderboard();
      const myCmds = lb.commands[sender] || 0;
      const rank = rankInfo(myCmds);
      const uptime = fmtUptime(Date.now() - db.stats.startedAt);
      const { time, date, greet } = nowParts(config.timezone);
      const host = process.env.DYNO || process.env.RAILWAY_ENVIRONMENT || 'Local';
      const ram = ramPct();

      const card = await renderCard(t, {
        tag: 'Online', badge: `${time} · ${date}`,
        title: config.botName, subtitle: 'All systems running',
        chips: [['UPTIME', uptime], ['COMMANDS', plugins.size], ['BOT RAM', `${memMB()} MB`], ['HOST', host]],
        bar: { left: `Server memory`, right: `${Math.round(ram)}% used`, pct: ram },
        footerL: `© 2026 ${owner(config)}`, footerR: repoShort(config)
      }, config.images.alive);

      const greeting = `_${greet}${pushName ? ', ' + pushName : ''}. Send ${config.prefix}menu to begin._\n${ghLine(config)}`;
      const caption = card
        ? greeting
        : t.wrap(
            t.banner(config, 'SYSTEM ONLINE') + '\n\n' +
            t.panel('STATUS', [t.kv('State', '● ONLINE'), t.kv('Uptime', uptime), t.kv('KeepAlive', 'ACTIVE'), t.kv('Time', `${time} · ${date}`)])
          ) + '\n' + greeting;

      const extra =
        t.wrap(
          t.panel('SYSTEM', [
            t.kv('Commands', plugins.size), t.kv('Prefix', config.prefix), t.kv('Bot RAM', `${memMB()} MB`),
            t.kv('Server', `${t.bar(ram, 8)} ${Math.round(ram)}%`),
            t.kv('Platform', `${os.platform()} ${os.arch()}`), t.kv('Node', process.version), t.kv('Host', host)
          ]) + '\n' +
          t.panel('YOU', [t.kv('Rank', rank.name), t.kv('Used', `${myCmds} cmds`)])
        ) + '\n' + t.wrap(t.sig(config));

      await sendImage(sock, from, card || config.images.alive, caption, extra,
        linkCtx(config, `${config.botName} · Online`, `Uptime ${uptime} · Tap for GitHub`, config.images.alive));
    }
  },

  /* ============ PING ============ */
  {
    command: 'ping',
    aliases: ['latency', 'speed'],
    description: 'Latency check',
    category: 'main',
    async run({ reply, sock, from, config, sender }) {
      const t = getTheme(config, sender);
      const start = Date.now();
      await reply('_pinging..._');
      const latency = Date.now() - start;

      const quality = latency < 100 ? 'EXCELLENT' : latency < 300 ? 'GOOD' : latency < 800 ? 'FAIR' : 'SLOW';
      const score = Math.max(5, 100 - Math.min(100, latency / 10));

      const card = sock ? await renderCard(t, {
        tag: 'Pong', title: `${latency} ms`, raw: true, subtitle: `Latency · ${quality}`,
        chips: [['QUALITY', quality], ['CPU LOAD', os.loadavg()[0].toFixed(2)], ['BOT RAM', `${memMB()} MB`]],
        bar: { left: 'Signal strength', right: `${Math.round(score)}%`, pct: score },
        footerL: `© 2026 ${owner(config)}`, footerR: config.botName
      }, config.images.menu) : null;

      if (card) return sendImage(sock, from, card, `_${quality} · ${latency} ms_`);

      await reply(
        t.wrap(
          t.banner(config, 'PONG') + '\n\n' +
          t.panel('LATENCY', [t.kv('Speed', `${latency} ms`), t.kv('Quality', quality), t.kv('Signal', `${t.bar(score, 10)} ${Math.round(score)}%`)]) + '\n' +
          t.panel('SERVER', [t.kv('CPU load', os.loadavg()[0].toFixed(2)), t.kv('Bot RAM', `${memMB()} MB`)])
        )
      );
    }
  },

  /* ============ UPTIME ============ */
  {
    command: 'uptime',
    aliases: ['up'],
    description: 'Bot uptime',
    category: 'main',
    async run({ reply, sock, from, config, sender }) {
      const t = getTheme(config, sender);
      const db = getDB();
      const ms = Date.now() - db.stats.startedAt;
      const sec = Math.floor(ms / 1000);
      const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;

      const milestones = [
        ['1 hour', 3600e3], ['6 hours', 6 * 3600e3], ['12 hours', 12 * 3600e3],
        ['1 day', 864e5], ['3 days', 3 * 864e5], ['1 week', 7 * 864e5], ['1 month', 30 * 864e5]
      ];
      const next = milestones.find(([, v]) => ms < v);
      const pct = next ? (ms / next[1]) * 100 : 100;
      const started = new Date(db.stats.startedAt).toLocaleString('en-GB', {
        timeZone: config.timezone || 'Africa/Nairobi',
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });

      const card = sock ? await renderCard(t, {
        tag: 'Uptime', title: fmtUptime(ms), raw: true, subtitle: 'Running without a break',
        chips: [['DAYS', d], ['HOURS', h], ['MINUTES', m], ['SINCE', started]],
        bar: { left: `Next milestone · ${next ? next[0] : 'all cleared'}`, right: `${Math.floor(pct)}%`, pct },
        footerL: `© 2026 ${owner(config)}`, footerR: config.botName
      }, config.images.menu) : null;

      if (card) return sendImage(sock, from, card, `_Online since ${started}_`);

      await reply(
        t.wrap(
          t.banner(config, 'UPTIME') + '\n\n' +
          t.panel('TIME ALIVE', [t.kv('Days', d), t.kv('Hours', h), t.kv('Minutes', m), t.kv('Seconds', s), t.kv('Since', started)]) + '\n' +
          t.panel('NEXT MILESTONE', [t.kv('Goal', next ? next[0] : 'All cleared'), t.kv('Progress', `${t.bar(pct, 10)} ${Math.floor(pct)}%`)])
        )
      );
    }
  },

  /* ============ REPO ============ */
  {
    command: 'repo',
    aliases: ['github', 'source'],
    description: 'Show repository',
    category: 'main',
    async run({ sock, from, config, sender }) {
      const t = getTheme(config, sender);
      const repo = repoUrl(config);
      const card = await renderCard(t, {
        tag: 'Open source', title: config.botName, subtitle: 'GitHub repository',
        chips: [['STAR', `${config.prefix}star`], ['FORK', `${config.prefix}fork`], ['ISSUES', `${config.prefix}issues`]],
        footerL: `© 2026 ${owner(config)}`, footerR: repoShort(config)
      }, config.images.banner || config.images.menu);

      const caption =
        (card ? '' : t.wrap(t.banner(config, 'OPEN SOURCE') + '\n\n' + t.panel('QUICK ACTIONS', [
          `${config.prefix}star    star the repo`, `${config.prefix}fork    fork it`, `${config.prefix}issues  report bugs`
        ])) + '\n') +
        `*Repository*\n${repo}\n\n*Star*  ${repo}/stargazers\n*Fork*  ${repo}/fork\n*Issues*  ${repo}/issues\n\n` +
        `_Every star keeps the updates coming._\n` + t.wrap(t.sig(config));

      await sock.sendMessage(from, {
        image: card || { url: config.images.banner || config.images.menu },
        caption,
        contextInfo: linkCtx(config, `${config.botName} · GitHub`, `By ${owner(config)} · Tap to open`, config.images.alive)
      });
    }
  },

  /* ============ STAR ============ */
  {
    command: 'star',
    description: 'Star the repo link',
    category: 'main',
    async run({ reply, config, sender }) {
      const t = getTheme(config, sender);
      await reply(t.wrap(t.banner(config, 'STAR THE REPO')) + `\n${repoUrl(config)}/stargazers\n\n_One tap helps the project grow._\n` + t.wrap(t.sig(config)));
    }
  },

  /* ============ FORK ============ */
  {
    command: 'fork',
    description: 'Fork the repo link',
    category: 'main',
    async run({ reply, config, sender }) {
      const t = getTheme(config, sender);
      await reply(t.wrap(t.banner(config, 'FORK THE REPO')) + `\n${repoUrl(config)}/fork\n\n_Build your own version and make it yours._\n` + t.wrap(t.sig(config)));
    }
  }
];