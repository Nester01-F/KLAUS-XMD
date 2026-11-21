 cat > lib/database.js << 'EOF'
const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '../data.json');

let db = {};
const DEFAULTS = {
  users: {},
  groups: {},
  stats: { commands: 0, startedAt: Date.now() },
  bot: {
    // 🌟 Automation settings (global)
    autoview: true,
    autoreact: true,
    autoread: false,
    autotyping: true,
    autobio: false,
    autoblock: false,
    statusreact: false,
    statusEmoji: '❤️',
    reactEmojis: ['❤️', '🔥', '💯', '✨', '👍', '🎉', '⚡', '💫']
  }
};

function loadDB() {
  try { db = JSON.parse(fs.readFileSync(dbFile, 'utf8')); }
  catch { db = JSON.parse(JSON.stringify(DEFAULTS)); saveDB(); }
  db.users = db.users || {};
  db.groups = db.groups || {};
  db.stats = db.stats || { commands: 0, startedAt: Date.now() };
  db.bot = { ...DEFAULTS.bot, ...(db.bot || {}) };
  return db;
}
function saveDB() { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }
function getDB() { return db; }

/* ---------------- USERS ---------------- */
function getUser(jid) {
  if (!db.users[jid]) {
    db.users[jid] = {
      jid, name: '', afk: null, warnings: 0,
      settings: { notifications: true, language: 'en' },
      createdAt: Date.now()
    };
    saveDB();
  }
  return db.users[jid];
}
function setUser(jid, patch) {
  const u = getUser(jid);
  Object.assign(u, patch);
  saveDB();
  return u;
}

/* ---------------- GROUPS ---------------- */
function getGroup(id) {
  if (!db.groups[id]) {
    db.groups[id] = {
      antilink: false, antispam: false, antibot: false,
      antidelete: false, antitag: false,
      welcome: true, goodbye: true,
      welcomeMsg: '', goodbyeMsg: '',
      warnings: {}, muteUntil: 0,
      settings: { prefix: '.', nsfw: false },
      createdAt: Date.now()
    };
    saveDB();
  }
  return db.groups[id];
}
function setGroup(id, patch) {
  const g = getGroup(id);
  Object.assign(g, patch);
  saveDB();
  return g;
}
function addWarning(groupId, jid, reason = '') {
  const g = getGroup(groupId);
  g.warnings[jid] = (g.warnings[jid] || 0) + 1;
  if (!g.warnLog) g.warnLog = [];
  g.warnLog.push({ jid, reason, at: Date.now() });
  saveDB();
  return g.warnings[jid];
}
function resetWarnings(groupId, jid) {
  const g = getGroup(groupId);
  delete g.warnings[jid];
  saveDB();
}
function getWarnings(groupId, jid) {
  return getGroup(groupId).warnings[jid] || 0;
}

/* ---------------- BOT SETTINGS ---------------- */
function getBot() { return db.bot; }
function setBot(patch) {
  Object.assign(db.bot, patch);
  saveDB();
  return db.bot;
}

/* ---------------- STATS ---------------- */
function bumpStat(key = 'commands') {
  db.stats[key] = (db.stats[key] || 0) + 1;
  saveDB();
}

module.exports = {
  loadDB, saveDB, getDB,
  getUser, setUser,
  getGroup, setGroup,
  addWarning, resetWarnings, getWarnings,
  getBot, setBot,
  bumpStat
};
EOF
echo "✅ lib/database.js upgraded"