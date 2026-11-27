const { getDB, getLeaderboard } = require('../lib/database');
const os = require('os');

const GROUP_LINK = 'https://chat.whatsapp.com/GMXcHGCsLEeKPTyHLr4SaG';

const IMAGES = {
  menu: [
    'https://files.catbox.moe/lusgnl.jpg',
    'https://raw.githubusercontent.com/Nester01-F/KLAUS-XMD/main/assets/menu.jpg'
  ],
  alive: [
    'https://files.catbox.moe/maj8xu.jpg',
    'https://raw.githubusercontent.com/Nester01-F/KLAUS-XMD/main/assets/alive.jpg'
  ],
  repo: [
    'https://files.catbox.moe/maj8xu.jpg',
    'https://raw.githubusercontent.com/Nester01-F/KLAUS-XMD/main/assets/repo.jpg'
  ]
};

const BANNER = `
================ KLAUS XMD ================
       WhatsApp Bot v1.0
       Powered by KLAUS TECH
       Made in Kenya
===========================================`;

const CAT_STYLE = {
  main: 'MAIN', download: 'DOWNLOAD', ai: 'AI', sticker: 'STICKER',
  stickers: 'PACKS', games: 'GAMES', fun: 'FUN', text: 'TEXT',
  tools: 'TOOLS', search: 'SEARCH', media: 'MEDIA', utility: 'UTILITY',
  info: 'INFO', status: 'STATUS', leaderboard: 'RANKS', group: 'GROUP',
  admin: 'ADMIN', settings: 'SETTINGS', automation: 'AUTO', owner: 'OWNER',
  other: 'OTHER'
};

function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

function userRank(n) {
  if (n >= 500) return 'LEGEND';
  if (n >= 200) return 'ELITE';
  if (n >= 100) return 'PRO';
  if (n >= 50)  return 'ACTIVE';
  if (n >= 10)  return 'REGULAR';
  return 'NEWBIE';
}

function bar(pct, w = 10) {
  const f = Math.max(0, Math.min(w, Math.round(pct / 100 * w)));
  return '[' + '='.repeat(f) + '-'.repeat(w - f) + ']';
}

function memMB() {
  return (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
}

function inlineCmds(prefix, cmds, perLine = 3) {
  const lines = [];
  for (let i = 0; i < cmds.length; i += perLine) {
    const chunk = cmds.slice(i, i + perLine);
    lines.push('  ' + chunk.map(c => '.' + c).join('  '));
  }
  return lines.join('\n');
}

function catBlock(prefix, cat, cmds) {
  const label = CAT_STYLE[cat] || cat.toUpperCase();
  return `--- ${label} (${cmds.length}) ---\n${inlineCmds(prefix, cmds, 3)}`;
}

async function fetchFirstWorking(urls, timeout = 8000) {
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) throw new Error('too small');
      return buf;
    } catch (e) {
      console.warn(`[ui] image failed: ${url} - ${e.message}`);
    }
  }
  return null;
}

/**
 * Send image + caption. NO externalAdReply to avoid silent failures.
 */
async function sendCard(sock, from, imgKey, caption) {
  const urls = IMAGES[imgKey] || [];
  const buf = await fetchFirstWorking(urls);

  if (buf) {
    try {
      await sock.sendMessage(from, { image: buf, caption });
      return true;
    } catch (e) {
      console.warn(`[ui] image send failed: ${e.message}`);
    }
  }

  // Text fallback
  await sock.sendMessage(from, { text: caption });
  return false;
}

function groupFooter() {
  return `\n--- JOIN OUR GROUP ---\n${GROUP_LINK}\n`;
}

module.exports = [
  /* ============ MENU ============ */
  {
    command: 'menu',
    aliases: ['help', 'cmds', 'commands'],
    description: 'Show all commands',
    category: 'main',
    async run({ sock, from, sender, text, reply, config, plugins }) {
      const cats = {};
      for (const [name, p] of plugins) {
        if (name === 'menu') continue;
        const c = p.category || 'other';
        (cats[c] = cats[c] || []).push(name);
      }

      // Drill-down
      if (text) {
        const cat = text.trim().toLowerCase();
        const list = (cats[cat] || []).sort();
        if (!list.length) {
          return reply(`Unknown category: ${cat}\n\nAvailable: ${Object.keys(cats).join(', ')}`);
        }
        const label = CAT_STYLE[cat] || cat.toUpperCase();

        let t = `=== ${label} (${list.length}) ===\n\n`;
        for (const c of list) {
          const desc = plugins.get(c)?.description || '';
          t += `.${c}`;
          if (desc) t += ` - ${desc}`;
          t += '\n';
        }
        t += groupFooter();
        t += `\n${config.botName} - ${config.ownerName || 'Warrior Felix'}`;

        return sendCard(sock, from, 'menu', t);
      }

      // Full menu
      const db = getDB();
      const lb = getLeaderboard();
      const myCmds = lb.commands[sender] || 0;
      const uptime = fmtUptime(Date.now() - db.stats.startedAt);
      const lvl = Math.min(100, Math.floor(myCmds / 5));

      let txt = BANNER + '\n\n';

      txt += `--- SYSTEM ---\n`;
      txt += `Prefix   : ${config.prefix}\n`;
      txt += `Commands : ${plugins.size}\n`;
      txt += `Uptime   : ${uptime}\n`;
      txt += `Memory   : ${memMB()} MB\n`;
      txt += `Platform : ${os.platform()} ${os.arch()}\n`;
      txt += `Node     : ${process.version}\n\n`;

      txt += `--- PROFILE ---\n`;
      txt += `Rank  : ${userRank(myCmds)}\n`;
      txt += `Used  : ${myCmds} cmds\n`;
      txt += `Level : ${bar(lvl)} ${lvl}%\n\n`;

      const order = ['main','download','ai','sticker','stickers','games','fun','text','tools','search','media','utility','info','status','leaderboard','group','admin','settings','automation','owner','other'];
      const sorted = order.filter(c => cats[c]).concat(Object.keys(cats).filter(c => !order.includes(c)));

      for (const cat of sorted) {
        if (!cats[cat]) continue;
        txt += catBlock(config.prefix, cat, cats[cat].sort()) + '\n\n';
      }

      txt += groupFooter();
      txt += `\n${config.botName} - ${config.ownerName || 'Warrior Felix'} - Kenya`;

      await sendCard(sock, from, 'menu', txt);
    }
  },

  /* ============ ALIVE ============ */
  {
    command: 'alive',
    aliases: ['status'],
    description: 'Check bot status',
    category: 'main',
    async run({ sock, from, config, plugins, sender }) {
      const db = getDB();
      const lb = getLeaderboard();
      const myCmds = lb.commands[sender] || 0;
      const uptime = fmtUptime(Date.now() - db.stats.startedAt);

      const caption =
`=== KLAUS XMD ===

--- STATUS ---
State     : ONLINE
Uptime    : ${uptime}
Commands  : ${plugins.size}
Prefix    : ${config.prefix}
KeepAlive : ACTIVE

--- SYSTEM ---
Memory   : ${memMB()} MB
Platform : ${os.platform()} ${os.arch()}
Node     : ${process.version}
Host     : ${process.env.DYNO || 'Local'}

--- YOU ---
Rank : ${userRank(myCmds)}
Used : ${myCmds} commands

${config.ownerName || 'Warrior Felix'}`;

      await sendCard(sock, from, 'alive', caption);
    }
  },

  /* ============ PING ============ */
  {
    command: 'ping',
    aliases: ['latency', 'speed'],
    description: 'Latency check',
    category: 'main',
    async run({ reply }) {
      const t = Date.now();
      await reply('Pinging...');
      const latency = Date.now() - t;
      const quality = latency < 100 ? 'EXCELLENT' : latency < 300 ? 'GOOD' : latency < 800 ? 'FAIR' : 'SLOW';
      reply(
`=== PONG ===

Speed   : ${latency}ms
Quality : ${quality}
Rating  : ${bar(Math.max(5, 100 - Math.min(100, latency / 10)))}`
      );
    }
  },

  /* ============ UPTIME ============ */
  {
    command: 'uptime',
    aliases: ['up'],
    description: 'Bot uptime',
    category: 'main',
    async run({ sock, from, config }) {
      const db = getDB();
      const ms = Date.now() - db.stats.startedAt;
      const sec = Math.floor(ms / 1000);
      const d = Math.floor(sec / 86400);
      const h = Math.floor((sec % 86400) / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      const pct = Math.min(100, Math.floor(ms / 86400000 * 100));

      const caption =
`=== BOT UPTIME ===

--- TIME ALIVE ---
Days    : ${d}
Hours   : ${h}
Minutes : ${m}
Seconds : ${s}

--- PROGRESS ---
${bar(pct)} ${pct}%

${config.botName} - ${config.ownerName || 'Warrior Felix'}`;

      await sendCard(sock, from, 'alive', caption);
    }
  },

  /* ============ REPO ============ */
  {
    command: 'repo',
    aliases: ['github', 'source'],
    description: 'Show repository',
    category: 'main',
    async run({ sock, from, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      const caption =
`=== KLAUS XMD REPO ===

--- LINKS ---
Repo   : ${repo}
Star   : ${repo}/stargazers
Fork   : ${repo}/fork
Issues : ${repo}/issues

--- ACTIONS ---
.star   - star the repo
.fork   - fork it
.issues - report bugs

By ${config.ownerName || 'Warrior Felix'}`;

      await sendCard(sock, from, 'repo', caption);
    }
  },

  /* ============ STAR ============ */
  {
    command: 'star',
    description: 'Star the repo link',
    category: 'main',
    async run({ reply, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(`STAR THE REPO\n\n${repo}/stargazers\n\nEvery star helps the project grow!`);
    }
  },

  /* ============ FORK ============ */
  {
    command: 'fork',
    description: 'Fork the repo link',
    category: 'main',
    async run({ reply, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(`FORK THE REPO\n\n${repo}/fork\n\nBuild your own version!`);
    }
  },

  /* ============ ISSUES ============ */
  {
    command: 'issues',
    description: 'Report bugs',
    category: 'main',
    async run({ reply, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(`REPORT ISSUES\n\n${repo}/issues/new\n\nFound a bug? Let us know!`);
    }
  }
];