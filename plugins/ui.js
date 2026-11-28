const { getDB, getLeaderboard, getBot, setBot } = require('../lib/database');
const os = require('os');

const GROUP_LINK = 'https://chat.whatsapp.com/GMXcHGCsLEeKPTyHLr4SaG';
const DEFAULT_REPO = 'https://github.com/Nester01-F/KLAUS-XMD';
const TZ = process.env.BOT_TIMEZONE || 'Africa/Nairobi';
const DEFAULT_THEME = process.env.MENU_THEME || 'blood';

const IMAGES = {
  menu:  ['https://files.catbox.moe/lusgnl.jpg'],
  alive: ['https://files.catbox.moe/maj8xu.jpg'],
  repo:  ['https://files.catbox.moe/maj8xu.jpg']
};

/* ═══════════════ FONTS (unicode letter styles) ═══════════════ */
const FONTS = {
  sans:    { up: 0x1d5d4, lo: 0x1d5ee },  // 𝗔𝗕𝗖 𝗮𝗯𝗰
  fraktur: { up: 0x1d56c, lo: 0x1d586 },  // 𝕬𝕭𝕮 𝖆𝖇𝖈
  script:  { up: 0x1d4d0, lo: 0x1d4ea }   // 𝓐𝓑𝓒 𝓪𝓫𝓬
};

const font = (name) => (text) =>
  String(text).replace(/[A-Za-z0-9]/g, (c) => {
    const x = c.charCodeAt(0);
    const f = FONTS[name] || FONTS.sans;
    if (x >= 65 && x <= 90) return String.fromCodePoint(f.up + x - 65);
    if (x >= 97 && x <= 122) return String.fromCodePoint(f.lo + x - 97);
    return String.fromCodePoint(0x1d7ec + x - 48); // digits: bold sans for every font
  });

const bold = font('sans');

/* ═══════════════ THEMES (switch with .menustyle) ═══════════════ */
const THEMES = {
  blood: {
    label: 'Blood', hero: '🩸', title: 'fraktur', labelFont: 'fraktur', catIcon: '🩸',
    bar: `█${'▀'.repeat(18)}█`, barEnd: '🩸▄▄🩸▄▄▄🩸▄▄🩸▄▄▄🩸▄▄🩸',
    open: (h) => `┏━━ ${h}`, side: '┃ ', close: '┗━━🩸━━━🩸━━━━🩸━━🩸',
    arrow: '🩸', kv: '▸', dot: '🩸',
    taglines: [
      'Eternal uptime. Zero sleep. 🩸',
      'Born at midnight, runs forever.',
      'Thirsty for commands. 🩸',
      'Never sleeps. Never lags.',
      'The night belongs to the bot.'
    ]
  },
  cyber: {
    label: 'Cyber', hero: '🔥', title: 'fraktur',
    bar: '◢◤'.repeat(10), barEnd: '◥◣'.repeat(10),
    open: (h) => `╭─⟪ ${h} ⟫`, side: '│ ', close: '╰───────────────◆',
    arrow: '➤', kv: '➜', dot: '◆'
  },
  neon: {
    label: 'Neon', hero: '⚡', title: 'sans',
    bar: `✦${'━'.repeat(18)}✦`, barEnd: `✦${'━'.repeat(18)}✦`,
    open: (h) => `┏━❰ ${h} ❱━━━┓`, side: '┃ ', close: '┗━━━━━━━━━━━━━━━━━━┛',
    arrow: '⮞', kv: '▸', dot: '✦'
  },
  royal: {
    label: 'Royal', hero: '👑', title: 'script',
    bar: `♛ ${'═'.repeat(18)} ♛`, barEnd: `♛ ${'═'.repeat(18)} ♛`,
    open: (h) => `╔═〘 ${h} 〙═══╗`, side: '║ ', close: '╚═════════════════╝',
    arrow: '❯', kv: '»', dot: '♦'
  },
  flame: {
    label: 'Flame', hero: '🔥', title: 'fraktur', catIcon: '🔥',
    bar: `🔥${'▀'.repeat(16)}🔥`, barEnd: `🔥${'▄'.repeat(16)}🔥`,
    open: (h) => `╭━━ ${h}`, side: '┃ ', close: '╰━━━━━━━━━━━━━━━🔥',
    arrow: '🔥', kv: '➤', dot: '🔥'
  },
  ocean: {
    label: 'Ocean', hero: '🌊', title: 'script', catIcon: '🌊',
    bar: '≈'.repeat(20), barEnd: '≈'.repeat(20),
    open: (h) => `╭┈┈❮ ${h} ❯┈┈`, side: '┊ ', close: '╰┈┈┈┈┈┈┈┈┈┈┈┈┈🌊',
    arrow: '❖', kv: '≈', dot: '❖'
  },
  matrix: {
    label: 'Matrix', hero: '💻', title: 'sans', catIcon: '▣',
    bar: '░▒▓█▓▒░'.repeat(3), barEnd: '░▒▓█▓▒░'.repeat(3),
    open: (h) => `▛▀▀ ${h}`, side: '▌ ', close: '▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄',
    arrow: '»', kv: ':', dot: '▪'
  },
  sparkle: {
    label: 'Sparkle', hero: '✨', title: 'script',
    bar: '✧˖°.'.repeat(5) + '✧', barEnd: '✧˖°.'.repeat(5) + '✧',
    open: (h) => `╭─❨ ${h} ❩`, side: '│ ', close: '╰─────────────♡',
    arrow: '👉', kv: '✿', dot: '✿'
  },
  minimal: {
    label: 'Minimal', hero: '', plain: true, title: 'sans', catIcon: '',
    bar: '─'.repeat(22), barEnd: '─'.repeat(22),
    open: (h) => `『 ${h} 』`, side: '  ', close: '',
    arrow: '•', kv: ':', dot: '·'
  }
};

async function getTheme() {
  let name = DEFAULT_THEME;
  try { name = (await Promise.resolve(getBot()))?.menuTheme || DEFAULT_THEME; } catch {}
  return { name, T: THEMES[name] || THEMES.cyber };
}

// Builds the layout helpers for one theme
function makeUI(T) {
  const ui = {
    T,
    kv: (k, v) => `${bold(k)} ${T.kv} ${v}`,
    h: (t) => font(T.labelFont || 'sans')(t), // heading font (bold sans, or bold gothic for Blood)
    spaced: (t) => font(T.title)(String(t).toUpperCase().split('').join(' ')),
    banner: (title, emoji = '⚡') => {
      const e = T.plain ? '' : emoji;
      return `${T.bar}\n  ${e ? `${e} ` : ''}${title}${e ? ` ${e}` : ''}\n${T.barEnd}`;
    },
    panel: (emoji, title, rows) => `${ui.banner(ui.h(title), emoji)}\n${rows.map((r) => ` ${r}`).join('\n')}`,
    tree: (head, rows) =>
      [T.open(head), ...rows.map((r) => `${T.side}${r}`), T.close].filter(Boolean).join('\n')
  };
  return ui;
}

/* ═══════════════ HELPERS ═══════════════ */
function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

function userRank(n) {
  if (n >= 500) return 'LEGEND';
  if (n >= 200) return 'ELITE';
  if (n >= 100) return 'PRO';
  if (n >= 50)  return 'ACTIVE';
  if (n >= 10)  return 'REGULAR';
  return 'NEWBIE';
}

const levelBar = (n) => {
  const pct = Math.min(100, Math.floor(n / 5));
  const filled = Math.round(pct / 10);
  return `${'▰'.repeat(filled)}${'▱'.repeat(10 - filled)} ${pct}%`;
};

function getMem() {
  const used = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
  const total = (os.totalmem() / 1024 / 1024).toFixed(0);
  return `${used}/${total}MB`;
}

function getTimeInfo() {
  const now = new Date();
  const o = { timeZone: TZ };
  return {
    time: now.toLocaleTimeString('en-GB', { ...o, hour: '2-digit', minute: '2-digit' }),
    day: now.toLocaleDateString('en-GB', { ...o, weekday: 'long' }),
    date: now.toLocaleDateString('en-GB', o)
  };
}

function greeting(name) {
  const h = Number(new Date().toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }));
  const [emoji, word] =
    h < 5 ? ['🌙', 'Good night'] :
    h < 12 ? ['🌅', 'Good morning'] :
    h < 17 ? ['☀️', 'Good afternoon'] :
    h < 21 ? ['🌆', 'Good evening'] : ['🌙', 'Good night'];
  return `${emoji} ${word}, ${bold(name)}!`;
}

const TAGLINES = [
  'Fast. Reliable. Kenyan. 🇰🇪',
  'Type a command, we do the rest.',
  'Built different. Runs 24/7.',
  'Your wish is my command.',
  'Powered by pure Nairobi energy.'
];
const tagline = (T) => {
  const list = T?.taglines || TAGLINES;
  return list[Math.floor(Math.random() * list.length)];
};

async function fetchFirst(urls, t = 8000) {
  for (const u of urls) {
    try {
      const c = new AbortController();
      const timer = setTimeout(() => c.abort(), t);
      const r = await fetch(u, { signal: c.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
      clearTimeout(timer);
      if (!r.ok) continue;
      const b = Buffer.from(await r.arrayBuffer());
      if (b.length > 1000) return b;
    } catch {}
  }
  return null;
}

async function send(sock, from, key, caption) {
  const buf = await fetchFirst(IMAGES[key] || []);
  if (buf) {
    try { await sock.sendMessage(from, { image: buf, caption }); return; } catch {}
  }
  await sock.sendMessage(from, { text: caption });
}

/* ═══════════════ CATEGORIES ═══════════════ */
const CAT_ORDER = ['main','download','ai','sticker','stickers','games','fun','text','tools','search','media','utility','info','status','leaderboard','group','admin','settings','automation','owner','sports','other'];

const CATS = {
  main: ['🏠', 'MAIN'], download: ['📥', 'DOWNLOADERS'], ai: ['🧠', 'AI TOOLS'],
  sticker: ['🎴', 'STICKER'], stickers: ['🎴', 'STICKER PACKS'], games: ['🎮', 'GAMES'],
  fun: ['🎉', 'FUN'], text: ['🔤', 'TEXT TOOLS'], tools: ['🛠️', 'TOOLS'],
  search: ['🔎', 'SEARCH'], media: ['🎞️', 'MEDIA'], utility: ['🧰', 'UTILITY'],
  info: ['ℹ️', 'INFO'], status: ['📡', 'STATUS'], leaderboard: ['🏆', 'LEADERBOARD'],
  group: ['👥', 'GROUP'], admin: ['🛡️', 'ADMIN'], settings: ['⚙️', 'SETTINGS'],
  automation: ['🤖', 'AUTO'], owner: ['👑', 'OWNER'], sports: ['⚽', 'SPORTS'], other: ['📦', 'OTHER']
};
const catInfo = (c) => CATS[c] || ['📦', c.toUpperCase()];

// One category, one command per line:  ┃ ⮞ .play
const catBlock = (ui, cat, cmds, prefix) => {
  const [emoji, label] = catInfo(cat);
  const icon = ui.T.catIcon !== undefined ? ui.T.catIcon : emoji; // some themes use one icon for every category
  return ui.tree(
    `${icon ? `${icon} ` : ''}${ui.h(label)} ${ui.T.dot} ${cmds.length}`,
    cmds.map((c) => `${ui.T.arrow} ${prefix}${c}`)
  );
};

module.exports = [
  /* ═══ MENU ═══ */
  {
    command: 'menu',
    aliases: ['help', 'cmds', 'commands'],
    description: 'Show command menu',
    category: 'main',
    async run({ sock, from, sender, text, reply, config, plugins, msg }) {
      const { T } = await getTheme();
      const ui = makeUI(T);
      const prefix = config.prefix || '.';
      const botName = config.botName || 'KLAUS XMD';
      const ownerName = config.ownerName || 'Warrior Felix';

      const cats = {};
      for (const [n, p] of plugins) {
        if (n === 'menu') continue;
        const c = p.category || 'other';
        (cats[c] = cats[c] || []).push(n);
      }

      /* Drill-down: .menu download  (adds a description after each command) */
      if (text?.trim()) {
        const cat = text.trim().toLowerCase();
        const list = (cats[cat] || []).sort();
        if (!list.length) {
          return reply(`❌ Unknown category: *${cat}*\n\nAvailable: ${Object.keys(cats).sort().join(', ')}`);
        }
        const [emoji, label] = catInfo(cat);
        const rows = list.map((c) => {
          const d = plugins.get(c)?.description;
          return d ? `${T.arrow} ${prefix}${c} ─ ${d}` : `${T.arrow} ${prefix}${c}`;
        });
        return send(sock, from, 'menu', `${ui.panel(emoji, label, rows)}\n\n🔗 ${GROUP_LINK}`);
      }

      /* Full menu */
      const db = getDB();
      const lb = getLeaderboard();
      const myCmds = lb?.commands?.[sender] || 0;
      const { time, day, date } = getTimeInfo();

      const header = `${ui.banner(ui.spaced(botName), T.hero)}\n ${greeting(msg?.pushName || 'friend')}\n _${tagline(T)}_`;

      const system = ui.tree(`🖥️ ${ui.h('SYSTEM')}`, [
        `👑 ${ui.kv('Owner', ownerName)}`,
        `⚙️ ${ui.kv('Prefix', prefix)}`,
        `🌐 ${ui.kv('Mode', 'Public')}`,
        `⏱️ ${ui.kv('Uptime', fmtUptime(Date.now() - db.stats.startedAt))}`,
        `💾 ${ui.kv('RAM', getMem())}`,
        `🔌 ${ui.kv('Commands', plugins.size)}`,
        `🕒 ${time} ${T.dot} ${day} ${T.dot} ${date}`
      ]);

      const profile = ui.tree(`🏅 ${ui.h('YOUR PROFILE')}`, [
        ui.kv('Rank', bold(userRank(myCmds))),
        ui.kv('Used', `${myCmds} commands`),
        levelBar(myCmds)
      ]);

      const sorted = CAT_ORDER.filter((c) => cats[c])
        .concat(Object.keys(cats).filter((c) => !CAT_ORDER.includes(c)));
      const blocks = sorted.map((c) => catBlock(ui, c, cats[c].sort(), prefix));

      const footer =
`${T.bar}
💡 ${bold(`${prefix}menu <category>`)} ${T.arrow} descriptions
🎨 ${bold(`${prefix}menustyle`)} ${T.arrow} change the look
📢 ${bold('Join us')} ${T.arrow} ${GROUP_LINK}
${T.barEnd}
_${botName} ${T.dot} ${ownerName} ${T.dot} Kenya 🇰🇪_`;

      await send(sock, from, 'menu', [header, system, profile, ...blocks, footer].join('\n\n'));
    }
  },

  /* ═══ MENU STYLE ═══ */
  {
    command: 'menustyle',
    aliases: ['menutheme', 'theme'],
    description: 'Change the menu look (try .menustyle preview)',
    category: 'owner',
    owner: true,
    async run({ reply, args, isOwner, config }) {
      if (!isOwner) return reply('❌ Owner only.');
      const p = config?.prefix || '.';
      const pick = (args?.[0] || '').toLowerCase();
      const { name } = await getTheme();

      // .menustyle preview -> a small sample of every style in one message
      if (pick === 'preview') {
        const samples = Object.entries(THEMES).map(([key, T]) => {
          const ui = makeUI(T);
          return `*${key}*\n${ui.banner(ui.spaced('KLAUS XMD'), T.hero)}\n${catBlock(ui, 'download', ['play', 'ytmp4', 'tiktok'], p)}`;
        });
        return reply(`🎨 *MENU STYLES*\n\n${samples.join('\n\n')}\n\nPick one: ${p}menustyle <name>`);
      }

      if (!THEMES[pick]) {
        const list = Object.entries(THEMES).map(([k, t]) => `${t.arrow} ${k}`).join('\n');
        return reply(`🎨 *MENU STYLES*\n\n${list}\n\nCurrent: *${name}*\nSee them all: ${p}menustyle preview\nUsage: ${p}menustyle flame`);
      }
      await Promise.resolve(setBot({ menuTheme: pick }));
      reply(`✅ Menu style set to *${THEMES[pick].label}*. Send ${p}menu to see it.`);
    }
  },

  /* ═══ ALIVE ═══ */
  {
    command: 'alive',
    aliases: ['status'],
    description: 'Bot status',
    category: 'main',
    async run({ sock, from, config, plugins, sender }) {
      const { T } = await getTheme();
      const ui = makeUI(T);
      const db = getDB();
      const lb = getLeaderboard();
      const myCmds = lb?.commands?.[sender] || 0;
      const { time, date } = getTimeInfo();
      const botName = config.botName || 'KLAUS XMD';

      const t = `${ui.panel('🟢', 'BOT STATUS', [
        `✅ ${ui.kv('State', 'ONLINE')}`,
        `⏱️ ${ui.kv('Uptime', fmtUptime(Date.now() - db.stats.startedAt))}`,
        `🔌 ${ui.kv('Commands', plugins.size)}`,
        `⚙️ ${ui.kv('Prefix', config.prefix || '.')}`,
        `💾 ${ui.kv('Memory', getMem())}`,
        `🖥️ ${ui.kv('Host', process.env.DYNO || os.platform())}`,
        `🟩 ${ui.kv('Node', process.version)}`,
        `🕒 ${time} ${T.dot} ${date}`,
        `🏅 ${ui.kv('Rank', bold(userRank(myCmds)))} ${T.dot} ${myCmds} used`
      ])}\n\n_${botName} ${T.dot} ${config.ownerName || 'Warrior Felix'}_`;

      await send(sock, from, 'alive', t);
    }
  },

  /* ═══ PING ═══ */
  {
    command: 'ping',
    aliases: ['latency'],
    description: 'Ping',
    category: 'main',
    async run({ reply }) {
      const { T } = await getTheme();
      const ui = makeUI(T);
      const start = Date.now();
      await reply('🏓 Pinging...');
      const ms = Date.now() - start;
      const quality = ms < 100 ? 'EXCELLENT' : ms < 300 ? 'GOOD' : ms < 800 ? 'FAIR' : 'SLOW';
      reply(ui.panel('🏓', 'PONG', [`⚡ ${ui.kv('Speed', `${ms}ms`)}`, `📶 ${ui.kv('Quality', quality)}`]));
    }
  },

  /* ═══ UPTIME ═══ */
  {
    command: 'uptime',
    description: 'Uptime',
    category: 'main',
    async run({ sock, from, config }) {
      const { T } = await getTheme();
      const ui = makeUI(T);
      const db = getDB();
      const s = Math.floor((Date.now() - db.stats.startedAt) / 1000);
      const t = `${ui.panel('⏱️', 'UPTIME', [
        `📅 ${ui.kv('Days', Math.floor(s / 86400))}`,
        `🕐 ${ui.kv('Hours', Math.floor((s % 86400) / 3600))}`,
        `⏲️ ${ui.kv('Minutes', Math.floor((s % 3600) / 60))}`,
        `⏳ ${ui.kv('Seconds', s % 60)}`
      ])}\n\n_${config.botName || 'KLAUS XMD'}_`;
      await send(sock, from, 'alive', t);
    }
  },

  /* ═══ REPO ═══ */
  {
    command: 'repo',
    aliases: ['github', 'source'],
    description: 'Repository',
    category: 'main',
    async run({ sock, from, config }) {
      const { T } = await getTheme();
      const ui = makeUI(T);
      const p = config.prefix || '.';
      const t = `${ui.panel('📦', 'REPOSITORY', [
        `🔗 ${config.repo || DEFAULT_REPO}`,
        `⭐ ${p}star`,
        `🍴 ${p}fork`,
        `🐞 ${p}issues`
      ])}\n\n_${config.ownerName || 'Warrior Felix'}_`;
      await send(sock, from, 'repo', t);
    }
  },

  { command: 'star', category: 'main', description: 'Star repo',
    async run({ reply, config }) { reply(`⭐ ${bold('STAR THE REPO')}\n${config.repo || DEFAULT_REPO}/stargazers`); } },
  { command: 'fork', category: 'main', description: 'Fork repo',
    async run({ reply, config }) { reply(`🍴 ${bold('FORK THE REPO')}\n${config.repo || DEFAULT_REPO}/fork`); } },
  { command: 'issues', category: 'main', description: 'Report bugs',
    async run({ reply, config }) { reply(`🐞 ${bold('REPORT AN ISSUE')}\n${config.repo || DEFAULT_REPO}/issues/new`); } }
];