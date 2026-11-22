const { getDB, getLeaderboard } = require('../lib/database');
const os = require('os');

const CATEGORY_META = {
  main:        { icon: '🏠', label: 'MAIN',            color: '⚪' },
  download:    { icon: '📥', label: 'DOWNLOADERS',     color: '🔵' },
  sticker:     { icon: '🖼️', label: 'STICKER MAKER',   color: '🟣' },
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

/* ---------- Small clean banner (fits mobile) ---------- */
const BANNER = `
╔═══════════════════════════════════════╗
║   ╔═╗ ╦  ╔═╗ ╦ ╦ ╔═╗   ╦ ╦ ╔╦╗ ╔╦╗    ║
║   ╠═╣ ║  ╠═╣ ║ ║ ╚═╗   ╚╦╝ ║║║  ║║    ║
║   ╩ ╩ ╩  ╩ ╩ ╚═╝ ╚═╝    ╩  ╩ ╩ ═╩╝    ║
║                                       ║
║   ⚡ POWERED BY WARRIOR FELIX ⚡          ║
║   🇰🇪 MADE IN KENYA · v1.0             ║
╚═══════════════════════════════════════╝`;

/* ---------- Helpers ---------- */
function fmtUptime(ms) {
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

function userRank(count) {
  if (count >= 500) return '💎 LEGEND';
  if (count >= 200) return '👑 ELITE';
  if (count >= 100) return '🥇 PRO';
  if (count >= 50)  return '🥈 ACTIVE';
  if (count >= 10)  return '🥉 REGULAR';
  return '🐣 NEWBIE';
}

function progressBar(pct, width = 10) {
  const filled = Math.max(0, Math.min(width, Math.round(pct / 100 * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function fmtBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

/* ---------- Full menu ---------- */
function buildFullMenu(plugins, config, sender) {
  const cats = {};
  for (const [name, p] of plugins) {
    const c = p.category || 'other';
    (cats[c] = cats[c] || []).push(name);
  }

  const db = getDB();
  const lb = getLeaderboard();
  const myCmds = lb.commands[sender] || 0;
  const uptime = fmtUptime(Date.now() - db.stats.startedAt);
  const memMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

  const ownerName = config.ownerName || 'Warrior Felix';
  const ownerNumber = config.owner?.[0] || '254701881604';
  const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';

  let txt = '';

  // ═══ BANNER ═══
  txt += BANNER + '\n\n';

  // ═══ OWNER / DEV CARD ═══
  txt += `┏━━━━━「 👑 DEVELOPER 」━━━━━┓\n`;
  txt += `┃\n`;
  txt += `┃  👤 Name    »  *${ownerName}*\n`;
  txt += `┃  📱 Contact »  +${ownerNumber}\n`;
  txt += `┃  🌍 Region  »  🇰🇪 Kenya\n`;
  txt += `┃  🏢 Team    »  *WARRIOR FELIX*\n`;
  txt += `┃\n`;
  txt += `┃  🔗 *GitHub*\n`;
  txt += `┃  ${repo}\n`;
  txt += `┃\n`;
  txt += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;

  // ═══ SYSTEM STATS ═══
  txt += `┏━━━━━「 📊 SYSTEM 」━━━━━┓\n`;
  txt += `┃\n`;
  txt += `┃  ⚙️  Prefix   »  \`${config.prefix}\`\n`;
  txt += `┃  📦  Commands »  *${plugins.size}*\n`;
  txt += `┃  ⏱️  Uptime   »  *${uptime}*\n`;
  txt += `┃  💾  Memory   »  *${memMB} MB*\n`;
  txt += `┃  🖥️  Platform »  *${os.platform()} ${os.arch()}*\n`;
  txt += `┃  🟢  Node     »  *${process.version}*\n`;
  txt += `┃  🌐  Host     »  *${process.env.DYNO || process.env.RAILWAY_ENVIRONMENT || 'Local'}*\n`;
  txt += `┃\n`;
  txt += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;

  // ═══ YOUR PROFILE ═══
  txt += `┏━━━━━「 👤 YOUR PROFILE 」━━━━━┓\n`;
  txt += `┃\n`;
  txt += `┃  🎖️  Rank     »  *${userRank(myCmds)}*\n`;
  txt += `┃  📈  Used     »  *${myCmds}* commands\n`;
  txt += `┃  📊  Level    »  ${progressBar(Math.min(100, myCmds / 5))} ${Math.min(100, Math.floor(myCmds / 5))}%\n`;
  txt += `┃\n`;
  txt += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;

  // ═══ CATEGORIES ═══
  const order = [
    'main','download','ai','sticker','stickers','games',
    'fun','text','tools','search','media','utility',
    'info','status','leaderboard','group','admin',
    'settings','automation','owner','other'
  ];

  const sortedCats = order.filter(c => cats[c]).concat(
    Object.keys(cats).filter(c => !order.includes(c))
  );

  txt += `╔══════════════════════════════════════╗\n`;
  txt += `║       📋 *COMMAND CATEGORIES*        ║\n`;
  txt += `╚══════════════════════════════════════╝\n\n`;

  for (const cat of sortedCats) {
    if (!cats[cat]) continue;
    const meta = CATEGORY_META[cat] || { icon: '📦', label: cat.toUpperCase(), color: '⚪' };
    const cmds = cats[cat].sort();

    txt += `┏━${meta.color}「 ${meta.icon} *${meta.label}* 」\n`;
    txt += `┃\n`;

    for (let i = 0; i < cmds.length; i += 2) {
      const a = `▸ ${config.prefix}${cmds[i]}`;
      const b = cmds[i + 1] ? `▸ ${config.prefix}${cmds[i + 1]}` : '';
      txt += `┃  ${a.padEnd(18)}${b}\n`;
    }

    txt += `┃\n`;
    txt += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  // ═══ FOOTER ═══
  txt += `╔══════════════════════════════════════╗\n`;
  txt += `║         💡 *QUICK TIPS*              ║\n`;
  txt += `╠══════════════════════════════════════╣\n`;
  txt += `║  ▸ \`.menu <cat>\` → drill down        ║\n`;
  txt += `║  ▸ \`.top\`        → leaderboard       ║\n`;
  txt += `║  ▸ \`.settings\`   → bot settings      ║\n`;
  txt += `║  ▸ \`.ping\`       → test latency      ║\n`;
  txt += `╚══════════════════════════════════════╝\n\n`;

  // ═══ SIGNATURE ═══
  txt += `_⚡ KLAUS XMD · © 2026 ${ownerName}_\n`;
  txt += `_🇰🇪 Made in Kenya · WARRIOR FELIX_`;

  return txt;
}

/* ---------- Category drill-down ---------- */
function buildCategoryMenu(cat, plugins, config) {
  const meta = CATEGORY_META[cat] || { icon: '📦', label: cat.toUpperCase(), color: '⚪' };
  const list = [];
  for (const [name, p] of plugins) {
    if ((p.category || 'other') === cat) list.push({ name, desc: p.description || '' });
  }

  if (!list.length) return null;
  list.sort((a, b) => a.name.localeCompare(b.name));

  let txt = '';
  txt += `╔══════════════════════════════════════╗\n`;
  txt += `║  ${meta.color} ${meta.icon} *${meta.label}* (${list.length})\n`;
  txt += `╚══════════════════════════════════════╝\n\n`;

  for (const c of list) {
    txt += `▸ *${config.prefix}${c.name}*\n`;
    if (c.desc) txt += `   ↳ _${c.desc}_\n`;
    txt += `\n`;
  }

  txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  txt += `_Type \`${config.prefix}menu\` to see all categories_`;

  return txt;
}

/* ---------- Plugin export ---------- */
module.exports = {
  command: 'menu',
  aliases: ['help', 'cmds', 'commands'],
  description: 'Show all commands',
  category: 'main',
  async run({ sock, from, sender, text, reply, config, plugins }) {
    // ─── Drill-down: .menu games ───
    if (text) {
      const cat = text.trim().toLowerCase();
      const catMenu = buildCategoryMenu(cat, plugins, config);
      if (!catMenu) {
        const available = Object.keys(CATEGORY_META).join(', ');
        return reply(`❌ Unknown category: *${cat}*\n\nAvailable: ${available}`);
      }
      return sock.sendMessage(from, {
        image: { url: config.images.menu },
        caption: catMenu,
        contextInfo: {
          externalAdReply: {
            title: `${config.botName} — ${CATEGORY_META[cat]?.label || cat.toUpperCase()}`,
            body: `By ${config.ownerName || 'Warrior Felix'}`,
            thumbnailUrl: config.images.menu,
            sourceUrl: config.repo || 'https://github.com/Nester01-F/KLAUS-XMD',
            mediaType: 1
          }
        }
      });
    }

    // ─── Full menu ───
    const fullMenu = buildFullMenu(plugins, config, sender);

    // 🖼️ Send image + full caption (this is what shows the menu image)
    await sock.sendMessage(from, {
      image: { url: config.images.menu },
      caption: fullMenu,
      contextInfo: {
        externalAdReply: {
          title: `${config.botName} — Command Menu`,
          body: `By ${config.ownerName || 'Warrior Felix'} · WARRIOR FELIX`,
          thumbnailUrl: config.images.alive,
          sourceUrl: config.repo || 'https://github.com/Nester01-F/KLAUS-XMD',
          mediaType: 1
        }
      }
    });
  }
};