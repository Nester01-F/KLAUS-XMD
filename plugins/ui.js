const { getDB, getLeaderboard } = require('../lib/database');
const os = require('os');

const DEBUG_IMAGES = true;
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

/* ═══════════════════════════════════════════════════════════════
   🎨 STYLE SYSTEM
   ═══════════════════════════════════════════════════════════════ */

const BANNER = `
╔══════════════════════════════════════════╗
║  ██╗  ██╗██╗      █████╗ ██╗   ██╗███████╗
║  ██║ ██╔╝██║     ██╔══██╗██║   ██║██╔════╝
║  █████╔╝ ██║     ███████║██║   ██║███████╗
║  ██╔═██╗ ██║     ██╔══██║██║   ██║╚════██║
║  ██║  ██╗███████╗██║  ██║╚██████╔╝███████║
║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
║                                            ║
║      ⚡ POWERED BY KLAUS TECH 🇰🇪          ║
╚══════════════════════════════════════════╝`;

const CAT_STYLE = {
  main:        { icon: '🏠', dot: '⚪', tag: 'CORE' },
  download:    { icon: '📥', dot: '🔵', tag: 'MEDIA' },
  ai:          { icon: '🤖', dot: '🟢', tag: 'SMART' },
  sticker:     { icon: '🖼️', dot: '🟣', tag: 'VISUAL' },
  stickers:    { icon: '🎨', dot: '🟪', tag: 'PACKS' },
  games:       { icon: '🎮', dot: '🟠', tag: 'PLAY' },
  fun:         { icon: '🎉', dot: '🔴', tag: 'JOY' },
  text:        { icon: '✍️', dot: '🟣', tag: 'EDITOR' },
  tools:       { icon: '🛠️', dot: '🟡', tag: 'TOOLS' },
  search:      { icon: '🔍', dot: '🟡', tag: 'FIND' },
  media:       { icon: '🎬', dot: '🟪', tag: 'MEDIA' },
  utility:     { icon: '💬', dot: '🔷', tag: 'UTIL' },
  info:        { icon: 'ℹ️', dot: '🔵', tag: 'INFO' },
  status:      { icon: '👁️', dot: '🔴', tag: 'STATUS' },
  leaderboard: { icon: '🏆', dot: '🟠', tag: 'RANKS' },
  group:       { icon: '👥', dot: '🔷', tag: 'GROUP' },
  admin:       { icon: '🛡️', dot: '🔶', tag: 'ADMIN' },
  settings:    { icon: '⚙️', dot: '⚪', tag: 'CONFIG' },
  automation:  { icon: '🔄', dot: '🟢', tag: 'AUTO' },
  owner:       { icon: '👑', dot: '🟡', tag: 'ROOT' },
  other:       { icon: '📦', dot: '⚪', tag: 'MISC' }
};

/* ═══════════════════════════════════════════════════════════════
   🛠 HELPERS
   ═══════════════════════════════════════════════════════════════ */

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

function inlineCmds(prefix, cmds, perLine = 3) {
  const lines = [];
  for (let i = 0; i < cmds.length; i += perLine) {
    const chunk = cmds.slice(i, i + perLine);
    lines.push('  ' + chunk.map(c => `\`${prefix}${c}\``).join('  '));
  }
  return lines.join('\n');
}

function catBlock(prefix, cat, cmds) {
  const style = CAT_STYLE[cat] || { icon: '📦', dot: '⚪', tag: 'MISC' };
  const header = `┏━━${style.dot}「 ${style.icon} *${cat.toUpperCase()}* 」`;
  const tagLine = `┃   ${style.tag} · ${cmds.length} commands`;
  const cmdsLine = inlineCmds(prefix, cmds, 3);
  return `${header}\n${tagLine}\n┃\n${cmdsLine.split('\n').map(l => '┃' + l).join('\n')}\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}

/* ═══════════════════════════════════════════════════════════════
   🖼 IMAGE FETCH
   ═══════════════════════════════════════════════════════════════ */

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
      try {
        await sock.sendMessage(from, { image: buf, caption });
        return true;
      } catch (e2) {}
    }
  }

  await sock.sendMessage(from, { text: caption });
  return false;
}

function groupFooter() {
  return `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   📢 *JOIN OUR COMMUNITY*   ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃   🔗 ${GROUP_LINK}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

_👆 Tap the card above to join_`;
}

/* ═══════════════════════════════════════════════════════════════
   📋 PLUGINS
   ═══════════════════════════════════════════════════════════════ */

let senderGlobal = '';

module.exports = [
  /* ═══════════════════════════════════════════════════════════
     📋 MENU
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'menu',
    aliases: ['help', 'cmds', 'commands'],
    description: 'Show all commands',
    category: 'main',
    async run({ sock, from, sender, text, reply, config, plugins }) {
      senderGlobal = sender;
      const cats = {};
      for (const [name, p] of plugins) {
        if (name === 'menu') continue;
        const c = p.category || 'other';
        (cats[c] = cats[c] || []).push(name);
      }

      /* ═══ DRILL-DOWN ═══ */
      if (text) {
        const cat = text.trim().toLowerCase();
        const list = (cats[cat] || []).sort();
        if (!list.length) {
          return reply(
`❌ *Unknown category:* \`${cat}\`

📂 *Available:*
${Object.keys(cats).map(c => `• ${c}`).join('\n')}`
          );
        }
        const style = CAT_STYLE[cat] || { icon: '📦', dot: '⚪', tag: 'MISC' };

        let t = `╔══════════════════════════════════════╗\n`;
        t += `║  ${style.dot} ${style.icon} *${cat.toUpperCase()}*  ║\n`;
        t += `║  ${style.tag} · ${list.length} commands\n`;
        t += `╚══════════════════════════════════════╝\n\n`;

        for (const c of list) {
          const desc = plugins.get(c)?.description || '';
          t += `▸ \`${config.prefix}${c}\`\n`;
          if (desc) t += `   ↳ _${desc}_\n`;
        }

        t += `\n${groupFooter()}`;
        t += `\n\n_⚡ ${config.botName} · © 2026 ${config.ownerName || 'Warrior Felix'}_`;

        return sendCard(sock, from, 'menu', t, {
          externalAdReply: {
            title: `${config.botName} — ${cat.toUpperCase()}`,
            body: `${list.length} commands · Tap to join group`,
            thumbnailUrl: (IMAGES.alive[0]),
            sourceUrl: GROUP_LINK,
            mediaType: 1
          }
        });
      }

      /* ═══ FULL MENU ═══ */
      const db = getDB();
      const lb = getLeaderboard();
      const myCmds = lb.commands[sender] || 0;
      const uptime = fmtUptime(Date.now() - db.stats.startedAt);

      let txt = BANNER + '\n\n';

      /* ── SYSTEM PANEL ── */
      txt += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
      txt += `┃  ⚙️ *SYSTEM STATUS*          ┃\n`;
      txt += `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n`;
      txt += `┃  ▸ Prefix   : \`${config.prefix}\`\n`;
      txt += `┃  ▸ Commands : *${plugins.size}*\n`;
      txt += `┃  ▸ Uptime   : *${uptime}*\n`;
      txt += `┃  ▸ Memory   : *${memMB()} MB*\n`;
      txt += `┃  ▸ Platform : *${os.platform()} ${os.arch()}*\n`;
      txt += `┃  ▸ Node     : *${process.version}*\n`;
      txt += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;

      /* ── PROFILE PANEL ── */
      const lvl = Math.min(100, Math.floor(myCmds / 5));
      txt += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
      txt += `┃  👤 *YOUR PROFILE*           ┃\n`;
      txt += `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫\n`;
      txt += `┃  ▸ Rank  : *${userRank(myCmds)}*\n`;
      txt += `┃  ▸ Used  : *${myCmds}* cmds\n`;
      txt += `┃  ▸ Level : ${bar(lvl)} *${lvl}%*\n`;
      txt += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;

      /* ── CATEGORIES ── */
      const order = ['main','download','ai','sticker','stickers','games','fun','text','tools','search','media','utility','info','status','leaderboard','group','admin','settings','automation','owner','other'];
      const sorted = order.filter(c => cats[c]).concat(Object.keys(cats).filter(c => !order.includes(c)));

      for (const cat of sorted) {
        if (!cats[cat]) continue;
        const list = cats[cat].sort();
        txt += catBlock(config.prefix, cat, list) + '\n\n';
      }

      /* ── FOOTER ── */
      txt += groupFooter();
      txt += `\n\n╔══════════════════════════════════════╗\n`;
      txt += `║  ⚡ *${config.botName}* · © 2026      ║\n`;
      txt += `║  👑 ${config.ownerName || 'Warrior Felix'}\n`;
      txt += `║  🇰🇪 Made in Kenya                   ║\n`;
      txt += `╚══════════════════════════════════════╝`;

      await sendCard(sock, from, 'menu', txt, {
        externalAdReply: {
          title: `${config.botName} — Command Menu`,
          body: `📢 Join group · ${plugins.size} commands`,
          thumbnailUrl: (IMAGES.alive[0]),
          sourceUrl: GROUP_LINK,
          mediaType: 1
        }
      });
    }
  },

  /* ═══════════════════════════════════════════════════════════
     🟢 ALIVE
     ═══════════════════════════════════════════════════════════ */
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
┃ 🌐 Host     : *${process.env.DYNO || 'Local'}*
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

  /* ═══════════════════════════════════════════════════════════
     🏓 PING
     ═══════════════════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════════════════
     ⏱️ UPTIME
     ═══════════════════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════════════════
     📦 REPO
     ═══════════════════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════════════════
     ⭐ STAR
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'star',
    description: 'Star the repo link',
    category: 'main',
    async run({ reply, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(`⭐ *STAR THE REPO*\n\n${repo}/stargazers\n\n_Every star helps the project grow!_`);
    }
  },

  /* ═══════════════════════════════════════════════════════════
     🍴 FORK
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'fork',
    description: 'Fork the repo link',
    category: 'main',
    async run({ reply, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(`🍴 *FORK THE REPO*\n\n${repo}/fork\n\n_Build your own version!_`);
    }
  },

  /* ═══════════════════════════════════════════════════════════
     🐛 ISSUES
     ═══════════════════════════════════════════════════════════ */
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