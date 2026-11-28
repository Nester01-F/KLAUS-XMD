const { getDB, getLeaderboard } = require('../lib/database');
const os = require('os');

const GROUP_LINK = 'https://chat.whatsapp.com/GMXcHGCsLEeKPTyHLr4SaG';
const DEFAULT_REPO = 'https://github.com/Nester01-F/KLAUS-XMD';

const IMAGES = {
  menu:  ['https://files.catbox.moe/lusgnl.jpg'],
  alive: ['https://files.catbox.moe/maj8xu.jpg'],
  repo:  ['https://files.catbox.moe/maj8xu.jpg']
};

/* ── Helpers ────────────────────────────────────────────────── */
function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

function userRank(n) {
  if (n >= 500) return '◆ LEGEND';
  if (n >= 200) return '◇ ELITE';
  if (n >= 100) return '● PRO';
  if (n >= 50)  return '○ ACTIVE';
  if (n >= 10)  return '▪ REGULAR';
  return '▪ NEWBIE';
}

function getMem() {
  const used = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
  const total = (os.totalmem() / 1024 / 1024).toFixed(0);
  return `${used}/${total}MB`;
}

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
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

/* ── Theme ──────────────────────────────────────────────────── */
const CAT_ORDER = ['main','download','ai','sticker','stickers','games','fun','text','tools','search','media','utility','info','status','leaderboard','group','admin','settings','automation','owner','sports','other'];

const CAT_LABEL = {
  main: '🏠 MAIN', download: '📥 DOWNLOADERS', ai: '🧠 AI TOOLS', sticker: '🎴 STICKER',
  stickers: '🎴 STICKER PACKS', games: '🎮 GAMES', fun: '🎉 FUN', text: '🔤 TEXT',
  tools: '🛠️ TOOLS', search: '🔎 SEARCH', media: '🎞️ MEDIA', utility: '🧰 UTILITY',
  info: 'ℹ️ INFO', status: '📡 STATUS', leaderboard: '🏆 LEADERBOARD',
  group: '👥 GROUP', admin: '🛡️ ADMIN', settings: '⚙️ SETTINGS', automation: '🤖 AUTO',
  owner: '👑 OWNER', sports: '⚽ SPORTS', other: '📦 OTHER'
};

const labelOf = (c) => CAT_LABEL[c] || `📦 ${c.toUpperCase()}`;

const block = (title, lines) =>
  `╭─〔 ${title} 〕\n${lines.map((l) => `│ ${l}`).join('\n')}\n╰──────────────`;

// Commands in compact rows of 4: .play · .ytmp4 · .tiktok · .fb
const cmdRows = (prefix, list) =>
  chunk(list.map((c) => `${prefix}${c}`), 4).map((row) => row.join(' · '));

module.exports = [
  {
    command: 'menu',
    aliases: ['help', 'cmds', 'commands'],
    description: 'Show command menu',
    category: 'main',
    async run({ sock, from, sender, text, reply, config, plugins }) {
      const prefix = config.prefix || '.';
      const botName = (config.botName || 'KLAUS XMD').toUpperCase();
      const ownerName = config.ownerName || 'Warrior Felix';

      const cats = {};
      for (const [n, p] of plugins) {
        if (n === 'menu') continue;
        const c = p.category || 'other';
        (cats[c] = cats[c] || []).push(n);
      }

      /* Drill-down: .menu download */
      if (text?.trim()) {
        const cat = text.trim().toLowerCase();
        const list = (cats[cat] || []).sort();
        if (!list.length) {
          return reply(`❌ Unknown category: *${cat}*\n\n${Object.keys(cats).sort().join(' · ')}`);
        }
        const t = `${block(`${labelOf(cat)} · ${list.length}`, cmdRows(prefix, list))}\n\n🔗 ${GROUP_LINK}`;
        return send(sock, from, 'menu', t);
      }

      /* Full menu */
      const db = getDB();
      const lb = getLeaderboard();
      const myCmds = lb?.commands?.[sender] || 0;
      const uptime = fmtUptime(Date.now() - db.stats.startedAt);

      const header = [
        `╭━━━〔 ⚡ ${botName} ⚡ 〕━━━╮`,
        `┃ 👑 ${ownerName}  ·  Prefix ${prefix}  ·  v1.0.0`,
        `┃ ⏱️ ${uptime}  ·  💾 ${getMem()}  ·  🔌 ${plugins.size} cmds`,
        `┃ 🏅 ${userRank(myCmds)}  ·  ${myCmds} used`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯`
      ].join('\n');

      const sorted = CAT_ORDER.filter((c) => cats[c])
        .concat(Object.keys(cats).filter((c) => !CAT_ORDER.includes(c)));

      const sections = sorted.map((cat) => {
        const list = cats[cat].sort();
        return block(`${labelOf(cat)} · ${list.length}`, cmdRows(prefix, list));
      });

      const footer = `💡 *${prefix}menu <category>* for one section\n🔗 ${GROUP_LINK}`;

      await send(sock, from, 'menu', `${header}\n\n${sections.join('\n\n')}\n\n${footer}`);
    }
  },

  {
    command: 'alive',
    aliases: ['status'],
    description: 'Bot status',
    category: 'main',
    async run({ sock, from, config, plugins, sender }) {
      const db = getDB();
      const lb = getLeaderboard();
      const myCmds = lb?.commands?.[sender] || 0;
      const botName = (config.botName || 'KLAUS XMD').toUpperCase();

      const t =
`╭━━━〔 ⚡ ${botName} ⚡ 〕━━━╮
┃ 🟢 ONLINE  ·  ⏱️ ${fmtUptime(Date.now() - db.stats.startedAt)}
┃ 🔌 ${plugins.size} cmds  ·  Prefix ${config.prefix || '.'}
┃ 💾 ${getMem()}  ·  ${os.platform()}  ·  ${process.version}
┃ 🏅 ${userRank(myCmds)}  ·  ${myCmds} used
╰━━━━━━━━━━━━━━━━━━━━━━━╯
_${config.ownerName || 'Warrior Felix'}_`;

      await send(sock, from, 'alive', t);
    }
  },

  {
    command: 'ping',
    aliases: ['latency'],
    description: 'Ping',
    category: 'main',
    async run({ reply }) {
      const start = Date.now();
      await reply('🏓 Pinging...');
      const ms = Date.now() - start;
      const quality = ms < 100 ? 'EXCELLENT' : ms < 300 ? 'GOOD' : ms < 800 ? 'FAIR' : 'SLOW';
      reply(`🏓 *PONG* ${ms}ms  ·  ${quality}`);
    }
  },

  {
    command: 'uptime',
    description: 'Uptime',
    category: 'main',
    async run({ sock, from, config }) {
      const db = getDB();
      const t = `⏱️ *UPTIME*  ${fmtUptime(Date.now() - db.stats.startedAt)}\n_${config.botName || 'KLAUS XMD'}_`;
      await send(sock, from, 'alive', t);
    }
  },

  {
    command: 'repo',
    aliases: ['github', 'source'],
    description: 'Repository',
    category: 'main',
    async run({ sock, from, config }) {
      const repo = config.repo || DEFAULT_REPO;
      const p = config.prefix || '.';
      const t =
`╭─〔 📦 REPOSITORY 〕
│ 🔗 ${repo}
│ ⭐ ${p}star · 🍴 ${p}fork · 🐞 ${p}issues
╰──────────────
_${config.ownerName || 'Warrior Felix'}_`;

      await send(sock, from, 'repo', t);
    }
  },

  { command: 'star', category: 'main', description: 'Star repo',
    async run({ reply, config }) {
      reply(`⭐ *STAR THE REPO*\n${(config.repo || DEFAULT_REPO)}/stargazers`);
    }
  },
  { command: 'fork', category: 'main', description: 'Fork repo',
    async run({ reply, config }) {
      reply(`🍴 *FORK THE REPO*\n${(config.repo || DEFAULT_REPO)}/fork`);
    }
  },
  { command: 'issues', category: 'main', description: 'Report bugs',
    async run({ reply, config }) {
      reply(`🐞 *REPORT AN ISSUE*\n${(config.repo || DEFAULT_REPO)}/issues/new`);
    }
  }
];