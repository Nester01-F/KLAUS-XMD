const { getDB, getLeaderboard } = require('../lib/database');
const os = require('os');

const GROUP_LINK = 'https://chat.whatsapp.com/GMXcHGCsLEeKPTyHLr4SaG';

const IMAGES = {
  menu:  ['https://files.catbox.moe/lusgnl.jpg'],
  alive: ['https://files.catbox.moe/maj8xu.jpg'],
  repo:  ['https://files.catbox.moe/maj8xu.jpg']
};

function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
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

function getTimeInfo() {
  const now = new Date();
  return {
    time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    day: now.toLocaleDateString('en-GB', { weekday: 'long' }),
    date: now.toLocaleDateString('en-GB'),
  };
}

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

/* ═══════════════════════════════════════════════════════════════
   CYBER X THEME
   ═══════════════════════════════════════════════════════════════ */
const THEME = {
  header: (name) => `◢◤━━━━━ ${name.toUpperCase()} ━━━━━◥◣`,
  subheader: (name) => `   ▸ ${name}`,
  section: (name, count) => `◢◤ ${name} ◥◣ ── [${count}]`,
  kv: (k, v) => `  ◈ ${k.padEnd(10)} ${v}`,
  cmd: (c) => `  » ${c}`,
  footer: () => `◢◤━━━━━━━━━━━━━━━━━━━━━━━━━◥◣`,
  bullet: '▸',
  join: '◢◤ JOIN US ◥◣',
};

const CAT_ORDER = ['main','download','ai','sticker','stickers','games','fun','text','tools','search','media','utility','info','status','leaderboard','group','admin','settings','automation','owner','sports','other'];

const CAT_LABEL = {
  main:'MAIN', download:'DOWNLOADERS', ai:'AI TOOLS', sticker:'STICKER',
  stickers:'STICKER PACKS', games:'GAMES', fun:'FUN', text:'TEXT TOOLS',
  tools:'TOOLS', search:'SEARCH', media:'MEDIA', utility:'UTILITY',
  info:'INFO', status:'STATUS', leaderboard:'LEADERBOARD',
  group:'GROUP', admin:'ADMIN', settings:'SETTINGS', automation:'AUTO',
  owner:'OWNER', sports:'SPORTS', other:'OTHER'
};

module.exports = [
  {
    command: 'menu',
    aliases: ['help', 'cmds', 'commands'],
    description: 'Show command menu',
    category: 'main',
    async run({ sock, from, sender, text, reply, config, plugins }) {
      const cats = {};
      for (const [n, p] of plugins) {
        if (n === 'menu') continue;
        const c = p.category || 'other';
        (cats[c] = cats[c] || []).push(n);
      }

      /* Drill-down */
      if (text) {
        const cat = text.trim().toLowerCase();
        const list = (cats[cat] || []).sort();
        if (!list.length) return reply(`◢◤ UNKNOWN: ${cat} ◥◣\n\nAvailable:\n${Object.keys(cats).sort().join('\n')}`);
        const label = CAT_LABEL[cat] || cat.toUpperCase();
        let t = `${THEME.header(label)}\n\n`;
        for (const c of list) {
          t += `${THEME.cmd('.' + c)}\n`;
        }
        t += `\n${THEME.footer()}\n${GROUP_LINK}`;
        return send(sock, from, 'menu', t);
      }

      /* Full menu */
      const db = getDB();
      const lb = getLeaderboard();
      const myCmds = lb.commands[sender] || 0;
      const uptime = fmtUptime(Date.now() - db.stats.startedAt);
      const { time, day, date } = getTimeInfo();
      const mem = getMem();
      const ownerName = config.ownerName || 'Warrior Felix';
      const botName = config.botName || 'KLAUS XMD';

      let t = '';

      // ═══ HEADER ═══
      t += `◢◤━━━━━━━━━━━━━━━━━━━━━━━━━━━◥◣\n`;
      t += `◢◤  ${botName.toUpperCase()}  ◥◣\n`;
      t += `◢◤━━━━━━━━━━━━━━━━━━━━━━━━━━━◥◣\n\n`;

      // ═══ INFO PANEL ═══
      t += `┌───────────────────────────────┐\n`;
      t += THEME.kv('Prefix', config.prefix) + '\n';
      t += THEME.kv('User', ownerName) + '\n';
      t += THEME.kv('Mode', 'PUBLIC') + '\n';
      t += THEME.kv('Time', time) + '\n';
      t += THEME.kv('Day', day) + '\n';
      t += THEME.kv('Date', date) + '\n';
      t += THEME.kv('Version', '1.0.0') + '\n';
      t += THEME.kv('Plugins', plugins.size) + '\n';
      t += THEME.kv('RAM', mem) + '\n';
      t += THEME.kv('Uptime', uptime) + '\n';
      t += THEME.kv('Platform', os.platform()) + '\n';
      t += `└───────────────────────────────┘\n\n`;

      // ═══ PROFILE ═══
      t += `◢◤ ${THEME.bullet} YOUR PROFILE ◥◣\n`;
      t += `  ◈ Rank      ${userRank(myCmds)}\n`;
      t += `  ◈ Used      ${myCmds} commands\n`;
      t += `  ◈ Level     ${Math.min(100, Math.floor(myCmds / 5))}%\n\n`;

      // ═══ CATEGORIES ═══
      const sorted = CAT_ORDER.filter(c => cats[c]).concat(Object.keys(cats).filter(c => !CAT_ORDER.includes(c)));

      for (const cat of sorted) {
        if (!cats[cat]) continue;
        const list = cats[cat].sort();
        const label = CAT_LABEL[cat] || cat.toUpperCase();

        t += `╔═══════════════════════════════╗\n`;
        t += `║ ${label.padEnd(29)} ║\n`;
        t += `╚═══════════════════════════════╝\n`;
        for (const c of list) {
          t += `  » ${c}\n`;
        }
        t += '\n';
      }

      // ═══ FOOTER ═══
      t += `◢◤━━━━━━━━━━━━━━━━━━━━━━━━━━━◥◣\n`;
      t += `◢◤  JOIN OUR COMMUNITY  ◥◣\n`;
      t += `◢◤━━━━━━━━━━━━━━━━━━━━━━━━━━━◥◣\n`;
      t += `${GROUP_LINK}\n\n`;
      t += `_${botName} · ${ownerName} · Kenya_`;

      await send(sock, from, 'menu', t);
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
      const myCmds = lb.commands[sender] || 0;
      const uptime = fmtUptime(Date.now() - db.stats.startedAt);

      const t =
`◢◤━━━━━━━━━━━━━━━━━━━━━━━━━━━◥◣
◢◤  ${config.botName.toUpperCase()}  ◥◣
◢◤  SYSTEM ONLINE  ◥◣
◢◤━━━━━━━━━━━━━━━━━━━━━━━━━━━◥◣

┌───────────────────────────────┐
  ◈ State       ONLINE
  ◈ Uptime      ${uptime}
  ◈ Commands    ${plugins.size}
  ◈ Prefix      ${config.prefix}
  ◈ Memory      ${getMem()}
  ◈ Platform    ${os.platform()}
  ◈ Node        ${process.version}
└───────────────────────────────┘

◢◤ YOUR STATS ◥◣
  ◈ Rank        ${userRank(myCmds)}
  ◈ Used        ${myCmds} commands

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
      await reply('◢◤ Ping... ◥◣');
      const ms = Date.now() - start;
      const quality = ms < 100 ? 'EXCELLENT' : ms < 300 ? 'GOOD' : ms < 800 ? 'FAIR' : 'SLOW';

      reply(
`◢◤━━━━━━━━━━━━━━━━━━━━◥◣
  ◈ PONG  ${ms}ms
  ◈ QUALITY  ${quality}
◢◤━━━━━━━━━━━━━━━━━━━━◥◣`
      );
    }
  },

  {
    command: 'uptime',
    description: 'Uptime',
    category: 'main',
    async run({ sock, from, config }) {
      const db = getDB();
      const ms = Date.now() - db.stats.startedAt;
      const s = Math.floor(ms / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;

      const t =
`◢◤  UPTIME  ◥◣

  ◈ Days        ${d}
  ◈ Hours       ${h}
  ◈ Minutes     ${m}
  ◈ Seconds     ${sec}

_${config.botName}_`;

      await send(sock, from, 'alive', t);
    }
  },

  {
    command: 'repo',
    aliases: ['github', 'source'],
    description: 'Repository',
    category: 'main',
    async run({ sock, from, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';

      const t =
`◢◤  REPOSITORY  ◥◣

  ◈ Repo  ${repo}
  ◈ Star  .star
  ◈ Fork  .fork
  ◈ Bugs  .issues

_${config.ownerName || 'Warrior Felix'}_`;

      await send(sock, from, 'repo', t);
    }
  },

  { command: 'star', category: 'main', description: 'Star repo',
    async run({ reply, config }) {
      const r = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(`◢◤  STAR REPO  ◥◣\n\n${r}/stargazers`);
    }
  },
  { command: 'fork', category: 'main', description: 'Fork repo',
    async run({ reply, config }) {
      const r = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(`◢◤  FORK REPO  ◥◣\n\n${r}/fork`);
    }
  },
  { command: 'issues', category: 'main', description: 'Report bugs',
    async run({ reply, config }) {
      const r = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(`◢◤  REPORT ISSUES  ◥◣\n\n${r}/issues/new`);
    }
  }
];