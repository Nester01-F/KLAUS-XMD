const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '../data.json');

let db = {};
const DEFAULTS = {
  users: {},
  groups: {},
  stats: { commands: 0, startedAt: Date.now() }
};

function loadDB() {
  try { db = JSON.parse(fs.readFileSync(dbFile, 'utf8')); }
  catch { db = structuredClone(DEFAULTS); saveDB(); }
  // ensure shape
  db.users = db.users || {};
  db.groups = db.groups || {};
  db.stats = db.stats || DEFAULTS.stats;
  return db;
}
function saveDB() { fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }
function getDB() { return db; }

/* ---------------- GROUP CONFIG ---------------- */
function getGroup(id) {
  if (!db.groups[id]) {
    db.groups[id] = {
      antilink: false,
      antispam: false,
      welcome: true,
      goodbye: true,
      warnings: {},       // { jid: count }
      muteUntil: 0,
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

/* ---------------- USER WARNINGS ---------------- */
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

/* ---------------- STATS ---------------- */
function bumpStat(key = 'commands') {
  db.stats[key] = (db.stats[key] || 0) + 1;
  saveDB();
}

module.exports = {
  loadDB, saveDB, getDB,
  getGroup, setGroup,
  addWarning, resetWarnings, getWarnings,
  bumpStat
};