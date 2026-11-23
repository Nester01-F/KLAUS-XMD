const database = require('../lib/database');
const { BANNER, fmtUptime, hostName, panel } = require('../lib/ui');
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

/* ---------- Helpers ---------- */
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

// Works whether or not lib/database.js has getLeaderboard()
function leaderboard() {
  if (typeof database.getLeaderboard === 'function') {
    try { return database.getLeaderboard(); } catch { /* fall through */ }
  }
  const users = (database.getDB && database.getDB().users) || {};
  const commands = {};
  for (const [jid, u] of Object.entries(users)) commands[jid] = u.commandCount || 0;
  return { commands };
}

function startedAt() {
  const db = database.getDB ? database.getDB() : null;
  return db?.stats?.startedAt || Date.now() - process.uptime() * 1000;
}

/* ---------- Full menu: returns the image caption and the text body ---------- */
function buildFullMenu(plugins, config, sender) {
  const cats = {};
  for (const [name, p] of plugins) {
    const c = p.category || 'other';
    (cats[c] = cats[c] || []).push(name);
  }

  const myCmds = leaderboard().commands?.[sender] || 0;
  const uptime = fmtUptime(Date.now() - startedAt());
  const memMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

  const ownerName = config.ownerName || 'Warrior Felix';
  const ownerNumber = config.owner?.[0] || '254701881604';
  const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';

  /* ----- caption (stays under WhatsApp's image caption limit) ----- */
  let caption = BANNER + '\n\n';
  caption += panel('👑 DEVELOPER', [
    ['👤 Name', `*${ownerName}*`],
    ['📱 Contact', `+${ownerNumber}`],
    ['🌍 Region', '🇰🇪 Kenya'],
    '🔗 *GitHub*',
    repo
  ]);
  caption += `\n\n⚙️ \`${config.prefix}\`  ·  📦 *${plugins.size}* commands  ·  ⏱️ *${uptime}*`;

  /* ----- body (sent as a normal text message, no length problem) ----- */
  let body = '';

  body += panel('📊 SYSTEM', [
    ['⚙️ Prefix', `\`${config.prefix}\``],
    ['📦 Commands', `*${plugins.size}*`],
    ['⏱️ Uptime', `*${uptime}*`],
    ['💾 Memory', `*${memMB} MB*`],
    ['🖥️ Platform', `*${os.platform()} ${os.arch()}*`],
    ['🟢 Node', `*${process.version}*`],
    ['🌐 Host', `*${hostName()}*`]
  ]) + '\n\n';

  body += panel('👤 YOUR PROFILE', [
    ['🎖️ Rank', `*${userRank(myCmds)}*`],
    ['📈 Used', `*${myCmds}* commands`],
    ['📊 Level', `${progressBar(Math.min(100, myCmds / 5))} ${Math.min(100, Math.floor(myCmds / 5))}%`]
  ]) + '\n\n';

  const order = [
    'main', 'download', 'ai', 'sticker', 'stickers', 'games',
    'fun', 'text', 'tools', 'search', 'media', 'utility',
    'info', 'status', 'leaderboard', 'group', 'admin',
    'settings', 'automation', 'owner', 'other'
  ];
  const sortedCats = order.filter(c => cats[c]).concat(
    Object.keys(cats).filter(c => !order.includes(c))
  );

  body += `📋 *COMMAND CATEGORIES*\n\n`;

  for (const cat of sortedCats) {
    const meta = CATEGORY_META[cat] || { icon: '📦', label: cat.toUpperCase(), color: '⚪' };
    const cmds = cats[cat].sort();

    body += `┏━${meta.color}「 ${meta.icon} *${meta.label}* 」\n┃\n`;
    for (let i = 0; i < cmds.length; i += 2) {
      const a = `▸ ${config.prefix}${cmds[i]}`;
      const b = cmds[i + 1] ? `▸ ${config.prefix}${cmds[i + 1]}` : '';
      body += `┃  ${a.padEnd(18)}${b}\n`;
    }
    body += `┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  body += `💡 *QUICK TIPS*\n`;
  body += `▸ \`${config.prefix}menu <category>\` → drill down\n`;
  body += `▸ \`${config.prefix}top\` → leaderboard\n`;
  body += `▸ \`${config.prefix}settings\` → bot settings\n`;
  body += `▸ \`${config.prefix}ping\` → test latency\n\n`;
  body += `_⚡ ${config.botName} · © 2026 ${ownerName}_\n`;
  body += `_🇰🇪 Made in Kenya · WARRIOR FELIX_`;

  return { caption, body };
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

  let txt = `${meta.color} ${meta.icon} *${meta.label}* (${list.length})\n\n`;

  for (const c of list) {
    txt += `▸ *${config.prefix}${c.name}*\n`;
    if (c.desc) txt += `   ↳ _${c.desc}_\n`;
    txt += `\n`;
  }

  txt += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  txt += `_Type \`${config.prefix}menu\` to see all categories_`;

  return txt;
}

function adCard(config, title, thumb) {
  return {
    externalAdReply: {
      title,
      body: `By ${config.ownerName || 'Warrior Felix'}`,
      thumbnailUrl: thumb,
      sourceUrl: config.repo || 'https://github.com/Nester01-F/KLAUS-XMD',
      mediaType: 1
    }
  };
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
      try {
        await sock.sendMessage(from, {
          image: { url: config.images.menu },
          caption: catMenu.length <= 1000 ? catMenu : undefined,
          contextInfo: adCard(config, `${config.botName} · ${CATEGORY_META[cat]?.label || cat.toUpperCase()}`, config.images.menu)
        });
        if (catMenu.length > 1000) await reply(catMenu);
      } catch {
        await reply(catMenu);
      }
      return;
    }

    // ─── Full menu ───
    const { caption, body } = buildFullMenu(plugins, config, sender);
    try {
      await sock.sendMessage(from, {
        image: { url: config.images.menu },
        caption,
        contextInfo: adCard(config, `${config.botName} · Command Menu`, config.images.alive)
      });
      await reply(body);
    } catch {
      // image failed (e.g. host down): send everything as text instead
      await reply(caption + '\n\n' + body);
    }
  }
};