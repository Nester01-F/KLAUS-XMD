/**
 * KLAUS XMD: shared look for the menu, alive and connection messages.
 * Save as lib/ui.js
 */

const os = require('os');

/* Fixed banner: it now reads "KLAUS XMD" (the old art spelled "ALAUS YMD"),
   and it sits in a monospace block with no right-hand border, so it cannot
   line up wrongly on phones. */
const BANNER =
  '```\n' +
  '╦╔═╦  ╔═╗╦ ╦╔═╗  ═╗ ╦╔╦╗╔╦╗\n' +
  '╠╩╗║  ╠═╣║ ║╚═╗  ╔╩╦╝║║║ ║║\n' +
  '╩ ╩╩═╝╩ ╩╚═╝╚═╝  ╩ ╚═╩ ╩═╩╝\n' +
  '```\n' +
  '⚡ _Powered by Warrior Felix_ · 🇰🇪 _Made in Kenya_';

function fmtUptime(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

function hostName() {
  const e = process.env;
  if (e.DYNO) return 'Heroku';
  if (e.RAILWAY_ENVIRONMENT || e.RAILWAY_PROJECT_ID) return 'Railway';
  if (e.RENDER) return 'Render';
  if (e.KOYEB_APP_NAME) return 'Koyeb';
  if (e.P_SERVER_UUID || __dirname.startsWith('/home/container')) return 'Panel';
  return 'Local / VPS';
}

/* A card in the menu's style. Rows are plain strings or [label, value] pairs. */
function panel(title, rows = []) {
  let t = `┏━━━━━「 ${title} 」━━━━━┓\n┃\n`;
  for (const r of rows) {
    if (!r) continue;
    t += Array.isArray(r) ? `┃  ${r[0]} »  ${r[1]}\n` : `┃  ${r}\n`;
  }
  return t + '┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛';
}

function systemRows(plugins, config, startedAt) {
  const since = startedAt || Date.now() - process.uptime() * 1000;
  return [
    ['⚙️ Prefix', `\`${config.prefix}\``],
    ['📦 Commands', `*${plugins ? plugins.size : '?'}*`],
    ['⏱️ Uptime', `*${fmtUptime(Date.now() - since)}*`],
    ['💾 Memory', `*${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB*`],
    ['🖥️ Platform', `*${os.platform()} ${os.arch()}*`],
    ['🟢 Node', `*${process.version}*`],
    ['🌐 Host', `*${hostName()}*`]
  ];
}

/* The connection message and .alive both use this. */
function statusCard({ title = '✅ ONLINE', config, plugins, startedAt, extraRows = [] }) {
  const owner = config.ownerName || 'Warrior Felix';
  return [
    BANNER,
    '',
    panel(title, [
      ['🟢 Status', '*ONLINE*'],
      ['🤖 Bot', `*${config.botName}*`],
      ['👑 Owner', `*${owner}*`],
      ...extraRows,
      ['🔐 Session', '*Active*'],
      ['💓 KeepAlive', '*ON*']
    ]),
    '',
    panel('📊 SYSTEM', systemRows(plugins, config, startedAt)),
    '',
    `_⚡ ${config.botName} · © 2026 ${owner}_`
  ].join('\n');
}

module.exports = { BANNER, fmtUptime, hostName, panel, systemRows, statusCard };