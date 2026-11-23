const { getDB, getLeaderboard } = require('../lib/database');
const os = require('os');

const CATEGORY_META = {
  main:        { icon: '🏠', label: 'MAIN',            color: '⚪' },
  download:    { icon: '📥', label: 'DOWNLOADERS',     color: '🔵' },
  sticker:     { icon: '🖼️', label: 'STICKER',         color: '🟣' },
  stickers:    { icon: '🎨', label: 'STICKER PACKS',   color: '🟪' },
  ai:          { icon: '🤖', label: 'AI TOOLS',        color: '🟢' },
  tools:       { icon: '🛠️', label: 'TOOLS',           color: '🟡' },
  fun:         { icon: '🎉', label: 'FUN',             color: '🔴' },
  games:       { icon: '🎮', label: 'ARCADE',          color: '🟠' },
  group:       { icon: '👥', label: 'GROUP',           color: '🔷' },
  admin:       { icon: '🛡️', label: 'ADMIN',           color: '🔶' },
  owner:       { icon: '👑', label: 'OWNER',           color: '🟡' },
  settings:    { icon: '⚙️', label: 'SETTINGS',        color: '⚪' },
  automation:  { icon: '🔄', label: 'AUTOMATION',      color: '🟢' },
  text:        { icon: '✍️', label: 'TEXT',            color: '🟣' },
  info:        { icon: 'ℹ️', label: 'INFO',            color: '🔵' },
  media:       { icon: '🎬', label: 'MEDIA',           color: '🟪' },
  search:      { icon: '🔍', label: 'SEARCH',          color: '🟡' },
  utility:     { icon: '💬', label: 'UTILITY',         color: '🔷' },
  leaderboard: { icon: '🏆', label: 'LEADERBOARD',     color: '🟠' },
  status:      { icon: '👁️', label: 'STATUS',          color: '🔴' },
  other:       { icon: '📦', label: 'OTHER',           color: '⚪' }
};

function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
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

const HEADER = (config) => `╔══════════════════════════════════════╗\n║   ⚡ *${config.botName}* ⚡          ║\n╚══════════════════════════════════════╝`;

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
          return reply(`❌ Unknown category: *${cat}*\n\nAvailable: ${Object.keys(CATEGORY_META).join(', ')}`);
        }
        const meta = CATEGORY_META[cat] || { icon: '📦', label: cat.toUpperCase(), color: '⚪' };
        let t = `╔══════════════════════════════════════╗\n`;
        t += `║  ${meta.color} ${meta.icon} *${meta.label}* (${list.length})\n`;
        t += `╚══════════════════════════════════════╝\n\n`;
        for (const c of list) {
          const desc = plugins.get(c)?.description || '';
          t += `▸ *${config.prefix}${c}*\n`;
          if (desc) t += `   ↳ _${desc}_\n`;
        }
        return sock.sendMessage(from, { image: { url: config.images.menu }, caption: t });
      }

      // Full menu
      let txt = HEADER(config) + '\n\n';

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
      txt += `┃ 📊 Lvl  : ${bar(Math.min(100, myCmds / 5))}\n`;
      txt += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;

      const order = ['main','download','ai','sticker','stickers','games','fun','text','tools','search','media','utility','info','status','leaderboard','group','admin','settings','automation','owner','other'];
      const sorted = order.filter(c => cats[c]).concat(Object.keys(cats).filter(c => !order.includes(c)));

      for (const cat of sorted) {
        if (!cats[cat]) continue;
        const m = CATEGORY_META[cat] || { icon: '📦', label: cat.toUpperCase(), color: '⚪' };
        const list = cats[cat].sort();
        txt += `┏━${m.color}「 ${m.icon} *${m.label}* 」\n`;
        for (let i = 0; i < list.length; i += 2) {
          const a = `▸ ${config.prefix}${list[i]}`;
          const b = list[i + 1] ? `▸ ${config.prefix}${list[i + 1]}` : '';
          txt += `┃ ${a.padEnd(18)}${b}\n`;
        }
        txt += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      }

      txt += `_⚡ ${config.botName} · © 2026 ${config.ownerName || 'Warrior Felix'}_`;

      await sock.sendMessage(from, {
        image: { url: config.images.menu },
        caption: txt
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
║      _WhatsApp Bot v1.0_             ║
╚══════════════════════════════════════╝

┏━━━━━「 🟢 STATUS 」━━━━━┓
┃ ✅ State    : *ONLINE*
┃ ⏱️ Uptime   : *${uptime}*
┃ 💓 KeepAlive: *ACTIVE*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━「 📊 SYSTEM 」━━━━━┓
┃ 📦 Commands : *${plugins.size}*
┃ ⚙️ Prefix   : \`${config.prefix}\`
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

      await sock.sendMessage(from, {
        image: { url: config.images.alive },
        caption,
        contextInfo: {
          externalAdReply: {
            title: `${config.botName} — Online`,
            body: `Uptime ${uptime} · ${plugins.size} commands`,
            thumbnailUrl: config.images.alive,
            sourceUrl: config.repo || 'https://github.com/Nester01-F/KLAUS-XMD',
            mediaType: 1
          }
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

      const quality =
        latency < 100 ? '🟢 EXCELLENT' :
        latency < 300 ? '🟡 GOOD' :
        latency < 800 ? '🟠 FAIR' : '🔴 SLOW';

      const bar_ = bar(Math.max(5, 100 - Math.min(100, latency / 10)));

      reply(
`╔══════════════════════════════════════╗
║      🏓 *PONG!*                      ║
╚══════════════════════════════════════╝

┏━━━━━「 ⚡ LATENCY 」━━━━━┓
┃ 🚀 Speed   : *${latency}ms*
┃ 📊 Quality : *${quality}*
┃ 📈 Rating  : ${bar_}
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
    async run({ reply, config }) {
      const db = getDB();
      const ms = Date.now() - db.stats.startedAt;
      const sec = Math.floor(ms / 1000);
      const d = Math.floor(sec / 86400);
      const h = Math.floor((sec % 86400) / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      const pct = Math.min(100, Math.floor(ms / 86400000 * 100));

      reply(
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
┃ _1 day milestone_
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

> _${config.botName} · © ${config.ownerName || 'Warrior Felix'}_`
      );
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

_⚡ Help us grow — every star counts!_

> _By ${config.ownerName || 'Warrior Felix'}_`;

      await sock.sendMessage(from, {
        image: { url: config.images.banner || config.images.menu },
        caption,
        contextInfo: {
          externalAdReply: {
            title: `${config.botName} — GitHub Repository`,
            body: `By ${config.ownerName || 'Warrior Felix'} · KLAUS TECH`,
            thumbnailUrl: config.images.alive,
            sourceUrl: repo,
            mediaType: 1
          }
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
      reply(
`╔══════════════════════════════════════╗
║      ⭐ *STAR THE REPO*              ║
╚══════════════════════════════════════╝

🔗 ${repo}/stargazers

💡 Help the project grow — every ⭐ matters!`
      );
    }
  },

  /* ============ FORK ============ */
  {
    command: 'fork',
    description: 'Fork the repo link',
    category: 'main',
    async run({ reply, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(
`╔══════════════════════════════════════╗
║      🍴 *FORK THE REPO*              ║
╚══════════════════════════════════════╝

🔗 ${repo}/fork

💡 Build your own version — customize it!`
      );
    }
  }
];