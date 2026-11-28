const { getBot } = require('./database');
const logger = require('./logger');

const STATUS_JID = 'status@broadcast';
const DEFAULT_EMOJI = '❤️';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const bare = (jid = '') => jid.split('@')[0].split(':')[0];
const myJid = (sock) => `${bare(sock.user?.id)}@s.whatsapp.net`;
const safeBot = async () => (await Promise.resolve(getBot())) || {};

/* ---------- 👁️ AUTO VIEW + ❤️ STATUS REACT ---------- */
const seenStatuses = new Set();

async function autoViewStatus(sock, statuses) {
  const bot = await safeBot();
  if (!bot.autoview && !bot.statusreact) return;

  for (const status of statuses) {
    const key = status?.key;
    if (!key || key.remoteJid !== STATUS_JID) continue;
    if (key.fromMe || !status.message) continue;
    if (status.message.protocolMessage) continue; // status deletions

    // Baileys can emit the same status more than once
    if (seenStatuses.has(key.id)) continue;
    seenStatuses.add(key.id);
    if (seenStatuses.size > 500) seenStatuses.delete(seenStatuses.values().next().value);

    const poster = key.participant || status.participant;
    if (!poster) continue;
    const who = bare(poster);

    if (bot.autoview) {
      try {
        await sock.readMessages([key]);
        logger.info(`👁️ Viewed status from ${who}`);
      } catch (e) {
        logger.warn(`AutoView failed for ${key.id}: ${e.message}`);
      }
    }

    if (bot.statusreact) {
      try {
        await sleep(rand(1000, 3000)); // looks less bot-like
        await sock.sendMessage(
          STATUS_JID,
          { react: { text: bot.statusEmoji || DEFAULT_EMOJI, key } },
          { statusJidList: [poster, myJid(sock)] }
        );
        logger.info(`${bot.statusEmoji || DEFAULT_EMOJI} Reacted to status from ${who}`);
      } catch (e) {
        logger.warn(`StatusReact failed for ${key.id}: ${e.message}`);
      }
    }
  }
}

/* ---------- ❤️ AUTO REACT TO COMMAND ---------- */
async function autoReactCommand(sock, msg) {
  const bot = await safeBot();
  if (!bot.autoreact) return;

  const pool = Array.isArray(bot.reactEmojis) && bot.reactEmojis.length
    ? bot.reactEmojis
    : [DEFAULT_EMOJI];
  const emoji = pool[Math.floor(Math.random() * pool.length)];

  try {
    await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
  } catch (e) {
    logger.warn(`AutoReact failed: ${e.message}`);
  }
}

/* ---------- 📖 AUTO READ ---------- */
async function autoRead(sock, msg) {
  const bot = await safeBot();
  if (!bot.autoread) return;
  if (msg.key.remoteJid === STATUS_JID) return; // statuses are handled by autoview
  try { await sock.readMessages([msg.key]); } catch {}
}

/* ---------- ⌨️ AUTO TYPING ---------- */
async function autoTyping(sock, from) {
  const bot = await safeBot();
  if (!bot.autotyping) return;
  try {
    await sock.sendPresenceUpdate('composing', from);
    setTimeout(() => sock.sendPresenceUpdate('paused', from).catch(() => {}), 3000);
  } catch {}
}

/* ---------- 📞 AUTO REJECT CALLS ---------- */
async function autoRejectCall(sock, calls) {
  const bot = await safeBot();
  if (!bot.autorejectcall) return;

  for (const call of calls) {
    if (call.status !== 'offer') continue;
    try {
      await sock.rejectCall(call.id, call.from);
      logger.info(`📞 Rejected call from ${bare(call.from)}`);
    } catch (e) {
      logger.warn(`Reject call failed: ${e.message}`);
    }
  }
}

/* ---------- 🟢 ALWAYS ONLINE ---------- */
let onlineInterval = null;
const ONLINE_EVERY_MS = 25 * 1000; // re-announce presence every 25s

async function pingOnline(sock) {
  try {
    await sock.sendPresenceUpdate('available');
  } catch (e) {
    logger.debug(`Always-online ping failed: ${e.message}`); // e.g. socket reconnecting
  }
}

// Returns true if started, false if AlwaysOnline is disabled
async function startAlwaysOnline(sock) {
  const bot = await safeBot();
  stopAlwaysOnline();                  // never stack intervals (also drops a stale sock after reconnect)
  if (!bot.alwaysonline) return false;

  await pingOnline(sock);
  onlineInterval = setInterval(() => pingOnline(sock), ONLINE_EVERY_MS);
  logger.info('🟢 AlwaysOnline started');
  return true;
}

function stopAlwaysOnline(sock, goOffline = false) {
  if (onlineInterval) { clearInterval(onlineInterval); onlineInterval = null; }
  if (goOffline && sock) sock.sendPresenceUpdate('unavailable').catch(() => {});
}

/* ---------- 🎵 AUTO BIO ---------- */
let bioInterval = null;
const BIO_INTERVAL_MS = 15 * 60 * 1000; // frequent profile edits can look automated; 15 min is gentler than 5
const BIO_QUOTES = [
  '⚡ KLAUS XMD — Powered by KLAUS TECH',
  '🇰🇪 Made in Kenya with ❤️',
  '🤖 94+ Commands · Fast · Reliable',
  '🚀 Deploy anywhere · Anytime',
  '🛡️ Antilink · Antispam · Autoview',
  '✨ KLAUS XMD © Warrior Felix'
];

async function updateBio(sock) {
  const q = BIO_QUOTES[Math.floor(Math.random() * BIO_QUOTES.length)];
  try {
    await sock.updateProfileStatus(q);
    logger.info(`📝 Bio updated: ${q}`);
  } catch (e) {
    logger.warn(`Bio update failed: ${e.message}`);
  }
}

// Returns true if started, false if AutoBio is disabled
async function startAutoBio(sock) {
  const bot = await safeBot();
  stopAutoBio();
  if (!bot.autobio) return false;

  await updateBio(sock); // don't wait for the first update
  bioInterval = setInterval(() => updateBio(sock), BIO_INTERVAL_MS);
  logger.info(`🎵 AutoBio started (${BIO_INTERVAL_MS / 60000} min interval)`);
  return true;
}

function stopAutoBio() {
  if (bioInterval) { clearInterval(bioInterval); bioInterval = null; }
}

/* ---------- 🚀 START EVERYTHING THAT RUNS ON A TIMER ---------- */
// Call when the connection opens (and again after every reconnect, since the sock changes)
async function initAutomation(sock) {
  await Promise.allSettled([startAutoBio(sock), startAlwaysOnline(sock)]);
}

/* ---------- 🛡️ AUTO BLOCK SPAMMERS ---------- */
const blockCache = new Map();
const WINDOW_MS = 10000;
const MAX_MSGS = 15;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of blockCache) if (now - v.firstAt > WINDOW_MS) blockCache.delete(k);
}, 60 * 1000).unref();

async function autoBlockCheck(sock, sender, isOwner = false) {
  if (isOwner || !sender || sender.endsWith('@g.us')) return;
  const bot = await safeBot();
  if (!bot.autoblock) return;

  const now = Date.now();
  const entry = blockCache.get(sender) || { count: 0, firstAt: now };
  if (now - entry.firstAt > WINDOW_MS) { entry.count = 0; entry.firstAt = now; }
  entry.count++;
  blockCache.set(sender, entry);

  if (entry.count > MAX_MSGS) {
    try {
      await sock.updateBlockStatus(sender, 'block');
      logger.warn(`🛡️ Auto-blocked spammer: ${sender}`);
    } catch (e) {
      logger.warn(`Auto-block failed: ${e.message}`);
    } finally {
      blockCache.delete(sender);
    }
  }
}

module.exports = {
  autoViewStatus, autoReactCommand, autoRead, autoTyping,
  autoRejectCall, startAutoBio, stopAutoBio,
  startAlwaysOnline, stopAlwaysOnline, initAutomation,
  autoBlockCheck
};