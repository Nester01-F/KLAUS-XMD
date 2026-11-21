const { getGroup, addWarning, resetWarnings, setGroup } = require('./database');
const logger = require('./logger');

const LINK_REGEX = /(https?:\/\/[^\s]+|wa\.me\/[^\s]+|chat\.whatsapp\.com\/[^\s]+|t\.me\/[^\s]+)/i;
const SPAM_WINDOW_MS = 5000;   // 5 seconds
const SPAM_THRESHOLD = 6;      // messages
const MAX_WARNINGS = 3;        // auto-kick after 3

const spamCache = new Map(); // `${groupId}:${jid}` -> { count, firstAt }

async function isAdmin(sock, groupId, jid) {
  try {
    const meta = await sock.groupMetadata(groupId);
    const p = meta.participants.find(x => x.id === jid);
    return !!(p?.admin);
  } catch { return false; }
}

async function guardMessage({ sock, msg, from, sender, text }) {
  if (!from.endsWith('@g.us')) return;
  if (!text) return;

  const group = getGroup(from);
  const admin = await isAdmin(sock, from, sender);

  /* ---------- ANTILINK ---------- */
  if (group.antilink && LINK_REGEX.test(text) && !admin) {
    try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
    const count = addWarning(from, sender, 'antilink');
    if (count >= MAX_WARNINGS) {
      await sock.sendMessage(from, {
        text: `🚫 @${sender.split('@')[0]} *removed* — max warnings reached.`,
        mentions: [sender]
      });
      try { await sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch {}
      resetWarnings(from, sender);
    } else {
      await sock.sendMessage(from, {
        text: `⚠️ @${sender.split('@')[0]} *links are not allowed!*\nWarnings: *${count}/${MAX_WARNINGS}*`,
        mentions: [sender]
      });
    }
    logger.warn(`Antilink triggered: ${sender} in ${from}`);
    return true; // handled
  }

  /* ---------- ANTISPAM ---------- */
  if (group.antispam && !admin) {
    const key = `${from}:${sender}`;
    const now = Date.now();
    const entry = spamCache.get(key) || { count: 0, firstAt: now };
    if (now - entry.firstAt > SPAM_WINDOW_MS) {
      entry.count = 0;
      entry.firstAt = now;
    }
    entry.count++;
    spamCache.set(key, entry);

    if (entry.count > SPAM_THRESHOLD) {
      try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
      const count = addWarning(from, sender, 'antispam');
      await sock.sendMessage(from, {
        text: `🚫 @${sender.split('@')[0]} *slow down!*\nWarnings: *${count}/${MAX_WARNINGS}*`,
        mentions: [sender]
      });
      spamCache.delete(key);
      if (count >= MAX_WARNINGS) {
        try { await sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch {}
        resetWarnings(from, sender);
      }
      return true;
    }
  }
  return false;
}

module.exports = { guardMessage, isAdmin };