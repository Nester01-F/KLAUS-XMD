const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, '../data.json');

let db = {};

const DEFAULT_SETTINGS = {
  autoviewstatus: false,
  autoreactstatus: false,
  autoread: false,
  autotyping: false,
  autorecording: false,
  antiviewonce: false,
  autobio: false,
  autoblock: false,
  reactEmoji: '🩸',
  bioText: '',
  blockPrefixes: []
};

const DEFAULTS = {
  users: {},
  groups: {},
  settings: { ...DEFAULT_SETTINGS },
  stats: { commands: 0, startedAt: Date.now() },
  leaderboard: { games: {}, commands: {} },
  stickerPacks: {}
};

function loadDB() {
  try {
    db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  } catch {
    db = JSON.parse(JSON.stringify(DEFAULTS));
    saveDB();
  }
  db.users = db.users || {};
  db.groups = db.groups || {};
  db.stats = db.stats || { commands: 0, startedAt: Date.now() };
  db.settings = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
  db.leaderboard = db.leaderboard || { games: {}, commands: {} };
  db.stickerPacks = db.stickerPacks || {};
  return db;
}

function saveDB() {
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

function getDB() { return db; }

/* ---------------- USERS ---------------- */
function getUser(jid) {
  if (!db.users[jid]) {
    db.users[jid] = {
      jid, name: '', afk: null, afkReason: '', warnings: 0,
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

/* ---------------- GLOBAL / AUTOMATION SETTINGS ---------------- */
function getSettings() {
  db.settings = { ...DEFAULT_SETTINGS, ...(db.settings || {}) };
  return db.settings;
}
function getSetting(key, fallback) {
  const s = getSettings();
  return s[key] === undefined ? fallback : s[key];
}
function setSetting(key, value) {
  getSettings()[key] = value;
  saveDB();
  return value;
}
function setSettings(patch) {
  Object.assign(getSettings(), patch);
  saveDB();
  return db.settings;
}

function getBot(key, fallback) {
  if (key === undefined) return getSettings();
  return getSetting(key, fallback);
}
function setBot(keyOrPatch, value) {
  if (keyOrPatch && typeof keyOrPatch === 'object') return setSettings(keyOrPatch);
  return setSetting(keyOrPatch, value);
}

/* ---------------- STATS ---------------- */
function bumpStat(key = 'commands') {
  db.stats[key] = (db.stats[key] || 0) + 1;
  saveDB();
}

/* ---------------- 🏆 LEADERBOARD ---------------- */
function addGameWin(jid, game) {
  if (!db.leaderboard) db.leaderboard = { games: {}, commands: {} };
  if (!db.leaderboard.games[game]) db.leaderboard.games[game] = {};
  db.leaderboard.games[game][jid] = (db.leaderboard.games[game][jid] || 0) + 1;
  saveDB();
}
function getGameTop(game, limit = 10) {
  if (!db.leaderboard) db.leaderboard = { games: {}, commands: {} };
  const board = db.leaderboard.games[game] || {};
  return Object.entries(board)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);
}
function addCommandUse(jid) {
  if (!db.leaderboard) db.leaderboard = { games: {}, commands: {} };
  db.leaderboard.commands[jid] = (db.leaderboard.commands[jid] || 0) + 1;
  saveDB();
}
function getCommandTop(limit = 10) {
  if (!db.leaderboard) db.leaderboard = { games: {}, commands: {} };
  return Object.entries(db.leaderboard.commands)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);
}
function getLeaderboard() {
  if (!db.leaderboard) db.leaderboard = { games: {}, commands: {} };
  return db.leaderboard;
}

/* ---------------- 🎨 STICKER PACKS ---------------- */
function addPack(name, owner, urls = []) {
  if (!db.stickerPacks) db.stickerPacks = {};
  if (!db.stickerPacks[name]) {
    db.stickerPacks[name] = { owner, urls: [], createdAt: Date.now() };
  }
  db.stickerPacks[name].urls.push(...urls);
  saveDB();
  return db.stickerPacks[name];
}
function getPack(name) {
  if (!db.stickerPacks) db.stickerPacks = {};
  return db.stickerPacks[name];
}
function listPacks() {
  if (!db.stickerPacks) db.stickerPacks = {};
  return Object.keys(db.stickerPacks);
}
function removePack(name) {
  if (!db.stickerPacks) db.stickerPacks = {};
  delete db.stickerPacks[name];
  saveDB();
}

module.exports = {
  loadDB, saveDB, getDB,
  getUser, setUser,
  getGroup, setGroup,
  addWarning, resetWarnings, getWarnings,
  getBot, setBot, getSettings, getSetting, setSetting, setSettings,
  bumpStat,
  addGameWin, getGameTop, addCommandUse, getCommandTop, getLeaderboard,
  addPack, getPack, listPacks, removePack
};
