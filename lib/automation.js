const { getBot, setBot } = require('./database');
const logger = require('./logger');

/* ---------- 👁️ AUTO VIEW STATUS ---------- */
async function autoViewStatus(sock, statuses) {
  const bot = getBot();
  if (!bot.autoview) return;

  for (const status of statuses) {
    const jid = status.key.participant || status.key.remoteJid;
    const id = status.key.id;

    try {
      await sock.readMessages([status.key]);
      if (bot.statusreact) {
        await sock.sendMessage(jid, {
          react: { text: bot.statusEmoji || '❤️', key: status.key }
        });
      }
      logger.info(`👁️ Viewed status from ${jid.split('@')[0]}`);
    } catch (e) {
      logger.warn(`AutoView failed for ${id}: ${e.message}`);
    }
  }
}

/* ---------- ❤️ AUTO REACT TO COMMAND ---------- */
async function autoReactCommand(sock, msg) {
  const bot = getBot();
  if (!bot.autoreact) return;

  const emojis = bot.reactEmojis || ['❤️'];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];

  try {
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: emoji, key: msg.key }
    });
  } catch (e) { /* silent */ }
}

/* ---------- 📖 AUTO READ ---------- */
async function autoRead(sock, msg) {
  const bot = getBot();
  if (!bot.autoread) return;
  try { await sock.readMessages([msg.key]); } catch {}
}

/* ---------- ⌨️ AUTO TYPING ---------- */
async function autoTyping(sock, from) {
  const bot = getBot();
  if (!bot.autotyping) return;
  try { await sock.sendPresenceUpdate('composing', from); } catch {}
}

/* ---------- 🎵 AUTO BIO (rotates every N min) ---------- */
let bioInterval = null;
const BIO_QUOTES = [
  '⚡ KLAUS XMD — Powered by KLAUS TECH',
  '🇰🇪 Made in Kenya with ❤️',
  '🤖 94+ Commands · Fast · Reliable',
  '🚀 Deploy anywhere · Anytime',
  '🛡️ Antilink · Antispam · Autoview',
  '✨ KLAUS XMD © Warrior Felix'
];

function startAutoBio(sock) {
  const bot = getBot();
  if (!bot.autobio) return;
  if (bioInterval) clearInterval(bioInterval);

  bioInterval = setInterval(async () => {
    const q = BIO_QUOTES[Math.floor(Math.random() * BIO_QUOTES.length)];
    try {
      await sock.updateProfileStatus(q);
      logger.info(`📝 Bio updated: ${q}`);
    } catch {}
  }, 5 * 60 * 1000); // 5 min

  logger.info('🎵 AutoBio started (5 min interval)');
}

function stopAutoBio() {
  if (bioInterval) { clearInterval(bioInterval); bioInterval = null; }
}

/* ---------- 🛡️ AUTO BLOCK SPAMMERS ---------- */
const blockCache = new Map();
async function autoBlockCheck(sock, sender) {
  const bot = getBot();
  if (!bot.autoblock) return;

  const now = Date.now();
  const entry = blockCache.get(sender) || { count: 0, firstAt: now };
  if (now - entry.firstAt > 10000) { entry.count = 0; entry.firstAt = now; }
  entry.count++;
  blockCache.set(sender, entry);

  if (entry.count > 15) { // 15 messages in 10s
    try {
      await sock.updateBlockStatus(sender, 'block');
      logger.warn(`🛡️ Auto-blocked spammer: ${sender}`);
      blockCache.delete(sender);
    } catch {}
  }
}

module.exports = {
  autoViewStatus, autoReactCommand, autoRead, autoTyping,
  startAutoBio, stopAutoBio, autoBlockCheck
};
