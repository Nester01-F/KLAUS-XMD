const { getDB, getLeaderboard } = require('../lib/database');
const os = require('os');
const fs = require('fs');
const path = require('path');

const DEBUG_IMAGES = true;
const GROUP_LINK = 'https://chat.whatsapp.com/GMXcHGCsLEeKPTyHLr4SaG';

/* ── MULTI-FALLBACK IMAGES ──────────────────────────────────── */
const IMAGES = {
  menu: [
    'https://files.catbox.moe/lusgnl.jpg',
    'https://raw.githubusercontent.com/Nester01-F/KLAUS-XMD/main/assets/menu.jpg',
    'https://i.imgur.com/8YVvX0A.jpeg'
  ],
  alive: [
    'https://files.catbox.moe/maj8xu.jpg',
    'https://raw.githubusercontent.com/Nester01-F/KLAUS-XMD/main/assets/alive.jpg',
    'https://i.imgur.com/8YVvX0A.jpeg'
  ],
  repo: [
    'https://files.catbox.moe/maj8xu.jpg',
    'https://raw.githubusercontent.com/Nester01-F/KLAUS-XMD/main/assets/repo.jpg',
    'https://i.imgur.com/8YVvX0A.jpeg'
  ]
};

/* ── TEXT BANNERS ───────────────────────────────────────────── */
const BANNERS = {
  neon: (config) => `
╔══════════════════════════════════════╗
║   ⚡ *${config.botName}* ⚡          ║
║      _WhatsApp Bot v1.0_             ║
╚══════════════════════════════════════╝`,
  royal: (config) => `
╔══════════════════════════════════════╗
║      👑 *${config.botName}* 👑       ║
║      _Premium WhatsApp Bot_          ║
╚══════════════════════════════════════╝`,
  hacker: (config) => `
┌─[${config.botName}]─[~]
└─$ ./start --status
`
};

/* ── HELPERS ────────────────────────────────────────────────── */
function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

function userRank(n) {
  if (n >= 500) return '💎 LEGEND';
  if (n >= 200) return '👑 ELITE';
  if (n >= 100) return '🥇 PRO';
  if (n >= 50)  return '🥈 ACTIVE';
  if (n >= 10)  return '🥉 REGULAR';
  return '🐣 NEWBIE';
}

function bar(pct, w = 10) {
  const f = Math.max(0, Math.min(w, Math.round(pct / 100 * w)));
  return '█'.repeat(f) + '░'.repeat(w - f);
}

function memMB() {
  return (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
}

function waContact(config) {
  const num = String((config.owner && config.owner[0]) || '254701881604').replace(/\D/g, '');
  return `https://wa.me/${num}`;
}

/* ── IMAGE FETCH ────────────────────────────────────────────── */
async function fetchFirstWorking(urls, timeout = 8000) {
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 KlausBot/1.0' }
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) throw new Error('Image too small');
      return buf;
    } catch (e) {
      if (DEBUG_IMAGES) console.warn(`[ui] image failed: ${url} → ${e.message}`);
    }
  }
  return null;
}

/* ── SEND CARD ──────────────────────────────────────────────── */
async function sendCard(sock, from, imgKey, caption, contextInfo) {
  const urls = IMAGES[imgKey] || [];
  const buf = await fetchFirstWorking(urls);

  if (buf) {
    try {
      await sock.sendMessage(from, {
        image: buf,
        caption,
        ...(contextInfo ? { contextInfo } : {})
      });
      return true;
    } catch (e) {
      if (DEBUG_IMAGES) console.warn(`[ui] send with context failed: ${e.message}`);
      try {
        await sock.sendMessage(from, { image: buf, caption });
        return true;
      } catch (e2) {
        if (DEBUG_IMAGES) console.warn(`[ui] send plain failed: ${e2.message}`);
      }
    }
  }

  await sock.sendMessage(from, {
    text: caption + (DEBUG_IMAGES ? '\n\n_⚠️ Image unavailable_•' : '')
  });
  return false;
}

/* ── GROUP FOOTER BLOCK (reusable) ──────────────────────────── */
function groupFooter() {
  return `
╔══════════════════════════════════════╗
║      📢 *JOIN OUR GROUP*             ║
╠══════════════════════════════════════╣
║  🔗 ${GROUP_LINK}
╚══════════════════════════════════════╝

_Tap the card above to join_`;
}

/* ── PLUGINS ────────────────────────────────────────────────── */
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

      const db = getDB();
      const lb = getLeaderboard();
      const myCmds = lb.commands[sender] || 0;
      const uptime = fmtUptime(Date.now() - db.stats.startedAt);

      // Drill-down
      if (text) {
        const cat = text.trim().toLowerCase();
        const list = (cats[cat] || []).sort();
        if (!list.length) {
          return reply(`❌ Unknown category: *${cat}*\n\nAvailable: ${Object.keys(cats).join(', ')}`);
        }
        const label = cat.toUpperCase();
        let t = `╔══════════════════════════════════════╗\n║  📋 *${label}* (${list.length})\n╚══════════════════════════════════════╝\n\n`;
        for (const c of list) {
          const desc = plugins.get(c)?.description || '';
          t += `▸ *${config.prefix}${c}*\n`;
          if (desc) t += `   ↳ _${desc}_\n`;
        }
        t += groupFooter();
        return sendCard(sock, from, 'menu', t, {
          externalAdReply: {
            title: `${config.botName} — ${label}`,
            body: `📢 Join our group`,
            thumbnailUrl: (IMAGES.alive[0]),
            sourceUrl: GROUP_LINK,
            mediaType: 1
          }
        });
      }

      // Full menu
      let txt = `╔══════════════════════════════════════╗\n`;
      txt += `║   ⚡ *${config.botName}* ⚡          ║\n`;
      txt += `║      _Command Menu v1.0_             ║\n`;
      txt += `╚══════════════════════════════════════╝\n\n`;

      txt += `┏━━━━━「 📊 SYSTEM 」━━━━━┓\n`;
      txt += `┃ ⚙️ Prefix   : \`${config.prefix}\`\n`;
      txt += `┃ 📦 Commands : *${plugins.size}*\n`;
      txt += `┃ ⏱️ Uptime   : *${uptime}*\n`;
      txt += `┃ 💾 Memory   : *${memMB()} MB*\n`;
      txt += `┃ 🖥️ Platform : *${os.platform()} ${os.arch()}*\n`;
      txt += `┃ 🟢 Node     : *${process.version}*\n`;
      txt += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;

      txt += `┏━━━━━「 👤 PROFILE 」━━━━━┓\n`;
      txt += `┃ 🎖️ Rank : *${userRank(myCmds)}*\n`;
      txt += `┃ 📈 Used : *${myCmds}* commands\n`;
      txt += `┃ 📊 Lvl  : ${bar(Math.min(100, myCmds / 5))} ${Math.min(100, Math.floor(myCmds / 5))}%\n`;
      txt += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;

      const order = ['main','download','ai','sticker','stickers','games','fun','text','tools','search','media','utility','info','status','leaderboard','group','admin','settings','automation','owner','other'];
      const sorted = order.filter(c => cats[c]).concat(Object.keys(cats).filter(c => !order.includes(c)));

      for (const cat of sorted) {
        if (!cats[cat]) continue;
        const list = cats[cat].sort();
        txt += `┏━「 📦 *${cat.toUpperCase()}* (${list.length}) 」\n`;
        for (let i = 0; i < list.length; i += 2) {
          const a = `▸ ${config.prefix}${list[i]}`;
          const b = list[i + 1] ? `▸ ${config.prefix}${list[i + 1]}` : '';
          txt += `┃ ${a.padEnd(18)}${b}\n`;
        }
        txt += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      }

      // ═══ GROUP LINK FOOTER ═══
      txt += groupFooter();
      txt += `\n\n_⚡ ${config.botName} · © 2026 ${config.ownerName || 'Warrior Felix'}_`;

      await sendCard(sock, from, 'menu', txt, {
        externalAdReply: {
          title: `${config.botName} — Command Menu`,
          body: `📢 Join our group · ${plugins.size} commands`,
          thumbnailUrl: (IMAGES.alive[0]),
          sourceUrl: GROUP_LINK,
          mediaType: 1
        }
      });
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
`╔══════════════════════════════════════╗
║   ⚡ *${config.botName}* ⚡          ║
╚══════════════════════════════════════╝

┏━━━━━「 🟢 STATUS 」━━━━━┓
┃ ✅ State     : *ONLINE*
┃ ⏱️ Uptime    : *${uptime}*
┃ 📦 Commands  : *${plugins.size}*
┃ ⚙️ Prefix    : \`${config.prefix}\`
┃ 💓 KeepAlive : *ACTIVE*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━「 📊 SYSTEM 」━━━━━┓
┃ 💾 Memory   : *${memMB()} MB*
┃ 🖥️ Platform : *${os.platform()} ${os.arch()}*
┃ 🟢 Node     : *${process.version}*
┃ 🌐 Host     : *${process.env.DYNO || process.env.RAILWAY_ENVIRONMENT || 'Local'}*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━「 👤 YOU 」━━━━━┓
┃ 🎖️ Rank : *${userRank(myCmds)}*
┃ 📈 Used : *${myCmds}* commands
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

> _© 2026 ${config.ownerName || 'Warrior Felix'}_`;

      await sendCard(sock, from, 'alive', caption, {
        externalAdReply: {
          title: `${config.botName} — Online`,
          body: `Uptime ${uptime} · Tap to join group`,
          thumbnailUrl: (IMAGES.alive[0]),
          sourceUrl: GROUP_LINK,
          mediaType: 1
        }
      });
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
      await reply('🏓 Pinging...');
      const latency = Date.now() - t;
      const quality = latency < 100 ? '🟢 EXCELLENT' : latency < 300 ? '🟡 GOOD' : latency < 800 ? '🟠 FAIR' : '🔴 SLOW';
      reply(
`╔══════════════════════════════════════╗
║      🏓 *PONG!*                      ║
╚══════════════════════════════════════╝

┏━━━━━「 ⚡ LATENCY 」━━━━━┓
┃ 🚀 Speed   : *${latency}ms*
┃ 📊 Quality : *${quality}*
┃ 📈 Rating  : ${bar(Math.max(5, 100 - Math.min(100, latency / 10)))}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
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
`╔══════════════════════════════════════╗
║      ⏱️ *BOT UPTIME*                 ║
╚══════════════════════════════════════╝

┏━━━━━「 📅 TIME ALIVE 」━━━━━┓
┃ 🗓️ Days    : *${d}*
┃ 🕐 Hours   : *${h}*
┃ ⏱️ Minutes : *${m}*
┃ ⏲️ Seconds : *${s}*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━「 📊 PROGRESS 」━━━━━┓
┃ ${bar(pct)} *${pct}%*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

> _${config.botName} · © ${config.ownerName || 'Warrior Felix'}_`;

      await sendCard(sock, from, 'alive', caption, {
        externalAdReply: {
          title: `${config.botName} — Uptime`,
          body: `${d}d ${h}h ${m}m · Tap to join group`,
          thumbnailUrl: (IMAGES.alive[0]),
          sourceUrl: GROUP_LINK,
          mediaType: 1
        }
      });
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
`╔══════════════════════════════════════╗
║      📦 *KLAUS XMD REPOSITORY*       ║
╚══════════════════════════════════════╝

┏━━━━━「 🔗 LINKS 」━━━━━┓
┃
┃  🌐 Repo    »  ${repo}
┃  ⭐ Star    »  ${repo}/stargazers
┃  🍴 Fork    »  ${repo}/fork
┃  🐛 Issues  »  ${repo}/issues
┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━「 💡 ACTIONS 」━━━━━┓
┃
┃  \`.star\`   → ⭐ star the repo
┃  \`.fork\`   → 🍴 fork it
┃  \`.issues\` → 🐛 report bugs
┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

_⚡ Tap the card to open GitHub_

> _By ${config.ownerName || 'Warrior Felix'}_`;

      await sendCard(sock, from, 'repo', caption, {
        externalAdReply: {
          title: `${config.botName} — GitHub`,
          body: 'Tap to open on GitHub',
          thumbnailUrl: (IMAGES.alive[0]),
          sourceUrl: repo,
          mediaType: 1
        }
      });
    }
  },

  /* ============ STAR ============ */
  {
    command: 'star',
    description: 'Star the repo link',
    category: 'main',
    async run({ reply, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(`⭐ *STAR THE REPO*\n\n${repo}/stargazers\n\n_Every star helps the project grow!_`);
    }
  },

  /* ============ FORK ============ */
  {
    command: 'fork',
    description: 'Fork the repo link',
    category: 'main',
    async run({ reply, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(`🍴 *FORK THE REPO*\n\n${repo}/fork\n\n_Build your own version!_`);
    }
  },

  /* ============ ISSUES ============ */
  {
    command: 'issues',
    description: 'Report bugs',
    category: 'main',
    async run({ reply, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(`🐛 *REPORT ISSUES*\n\n${repo}/issues/new\n\n_Found a bug? Let us know!_`);
    }
  }
];