/**
 * KLAUS XMD: view-once tools (owner only), all in one file
 *   .vv                   reply to a view-once -> saved to YOUR OWN chat (silent)
 *   .vv2                  reply to a view-once -> sent back into THIS chat
 *   .antiviewonce on|off  auto-forward every incoming view-once to your own chat
 *
 * Startup (once, right after makeWASocket, and again on reconnect):
 *   require('./commands/vv').attach(sock);
 */

const { downloadMediaMessage, normalizeMessageContent, jidNormalizedUser } = require('@whiskeysockets/baileys');
const logger = require('../lib/logger');
const { setBot, getBot } = require('../lib/database');

const WRAPPERS = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
const MEDIA = ['imageMessage', 'videoMessage', 'audioMessage'];

const MAX_ITEMS = 30;
const MAX_TOTAL_BYTES = 40 * 1024 * 1024; // 40 MB of cached media at most
const TTL_MS = 60 * 60 * 1000;            // keep for 1 hour

const cache = new Map();     // messageId -> { type, buffer, mimetype, caption, ptt, at }
const inFlight = new Set();  // ids being downloaded right now
const attached = new WeakSet();
let totalBytes = 0;

const digits = (raw) => String(raw || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');

/* ═══════════════════════ CACHE ═══════════════════════ */
function drop(id) {
  const item = cache.get(id);
  if (!item) return;
  totalBytes -= item.buffer.length;
  cache.delete(id);
}

function evict() {
  const now = Date.now();
  for (const [id, item] of cache) if (now - item.at > TTL_MS) drop(id);
  while (cache.size > MAX_ITEMS || totalBytes > MAX_TOTAL_BYTES) {
    drop(cache.keys().next().value); // Map keeps insertion order: first = oldest
  }
}

const getCached = (id) => cache.get(id) || null;

/* ═══════════════════════ DETECTION ═══════════════════════ */
function extractViewOnce(message) {
  if (!message) return null;
  const top = message.ephemeralMessage?.message || message;
  const wrapped = WRAPPERS.some((k) => top[k]);
  const inner = normalizeMessageContent(message);
  const type = MEDIA.find((k) => inner?.[k]);
  if (!type) return null;
  const media = inner[type];
  if (!wrapped && !media.viewOnce) return null;
  return { type, media };
}

/* ═══════════════════════ SENDING ═══════════════════════ */
async function sendItem(sock, jid, item, caption, opts = {}) {
  if (item.type === 'imageMessage') {
    return sock.sendMessage(jid, { image: item.buffer, caption }, opts);
  }
  if (item.type === 'videoMessage') {
    return sock.sendMessage(jid, { video: item.buffer, caption, mimetype: item.mimetype || 'video/mp4' }, opts);
  }
  await sock.sendMessage(jid, {
    audio: item.buffer,
    mimetype: item.mimetype || 'audio/ogg; codecs=opus',
    ptt: item.ptt
  }, opts);
  if (caption) await sock.sendMessage(jid, { text: caption });
}

async function forwardToOwner(sock, msg, item) {
  const me = jidNormalizedUser(sock.user.id);
  const chat = msg.key.remoteJid;
  const who = (msg.key.participant || chat).split('@')[0].split(':')[0];
  const head =
    `👁️ *Anti-ViewOnce*\n` +
    `👤 ${msg.pushName ? `${msg.pushName} (+${who})` : `+${who}`}\n` +
    `💬 ${chat.endsWith('@g.us') ? 'Group' : 'Private chat'}`;
  await sendItem(sock, me, item, item.caption ? `${head}\n\n${item.caption}` : head);
}

/* ═══════════════════════ CAPTURE ON ARRIVAL ═══════════════════════ */
async function cacheViewOnce(sock, msg) {
  const id = msg?.key?.id;
  try {
    if (!msg?.message || msg.key.fromMe || cache.has(id) || inFlight.has(id)) return;

    const found = extractViewOnce(msg.message);
    if (!found) return;

    inFlight.add(id);
    logger.info(`[VV] view-once detected (${found.type}) in ${msg.key.remoteJid}`);

    const buffer = await downloadMediaMessage(
      msg,
      'buffer',
      {},
      { logger, reuploadRequest: sock.updateMediaMessage }
    );
    if (!buffer?.length) throw new Error('empty download');

    const item = {
      type: found.type,
      buffer,
      mimetype: found.media.mimetype,
      caption: found.media.caption || '',
      ptt: !!found.media.ptt,
      at: Date.now()
    };
    cache.set(id, item);
    totalBytes += buffer.length;
    evict();
    logger.info(`[VV] cached ${found.type} (${Math.round(buffer.length / 1024)} KB)`);

    // Anti-ViewOnce: auto-forward to your own chat when enabled
    const bot = (await Promise.resolve(getBot())) || {};
    if (bot.antiviewonce) await forwardToOwner(sock, msg, item);
  } catch (e) {
    logger.warn(`[VV] capture failed: ${e.message}`);
  } finally {
    if (id) inFlight.delete(id);
  }
}

/** Hooks the upsert listener up by itself. Safe to call repeatedly. */
function attach(sock) {
  if (attached.has(sock)) return;
  attached.add(sock);
  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return; // skip history sync
    for (const m of messages) cacheViewOnce(sock, m);
  });
  logger.info('[VV] view-once listener attached');
}

/* ═══════════════════════ COMMAND HELPERS ═══════════════════════ */
const checkOwner = ({ isOwner, msg, config, sender }) => {
  const ownerNums = [].concat(config?.owner || []).map(digits);
  return !!(isOwner || msg.key.fromMe || ownerNums.includes(digits(sender)));
};

/** Finds the replied-to view-once: cache first, then a direct download as a fallback */
async function resolveItem(sock, msg) {
  const from = msg.key.remoteJid;

  // contextInfo can sit on any message type, not just extendedTextMessage
  const content = normalizeMessageContent(msg.message);
  const ctx = Object.values(content || {}).find((v) => v?.contextInfo)?.contextInfo;
  const quoted = ctx?.quotedMessage;
  if (!quoted) return { error: '↩️ Reply to a view-once photo, video or voice note.' };

  // 1) Copy captured when the message arrived
  const cached = getCached(ctx.stanzaId);
  if (cached) return { item: cached };

  // 2) Fallback: download from the quoted message itself
  const found = extractViewOnce(quoted);
  if (!found) {
    return {
      error:
        '❌ Not a view-once, or the bot never saw it arrive.\n' +
        `_Cache miss for ${ctx.stanzaId}. Check the logs for "[VV] view-once detected"._`
    };
  }

  const { type, media } = found;
  if (!media.mediaKey || !(media.url || media.directPath)) {
    return {
      error:
        '⚠️ WhatsApp stripped the media from the quote, and the bot has no saved copy.\n' +
        'The bot has to be online and listening when the view-once arrives. Try again on a new one.'
    };
  }

  try {
    const key = { remoteJid: from, id: ctx.stanzaId, participant: ctx.participant, fromMe: false };
    const buffer = await downloadMediaMessage(
      { message: quoted, key },
      'buffer',
      {},
      { logger, reuploadRequest: sock.updateMediaMessage }
    );
    if (!buffer?.length) return { error: '⚠️ Empty download. The view-once may have expired.' };
    return {
      item: { type, buffer, mimetype: media.mimetype, caption: media.caption || '', ptt: !!media.ptt }
    };
  } catch (e) {
    logger.error(`[VV] download failed: ${e.message}`);
    return { error: `⚠️ Download failed: ${e.message}` };
  }
}

/* ═══════════════════════ COMMANDS ═══════════════════════ */
module.exports = [
  /* .vv: save to your own chat, silently */
  {
    command: 'vv',
    aliases: ['viewonce', 'retrieve'],
    category: 'owner',
    description: 'Save a view-once to your private chat',
    async run(ctx) {
      const { sock, msg } = ctx;
      attach(sock);
      if (!checkOwner(ctx)) return;

      const from = msg.key.remoteJid;
      const me = jidNormalizedUser(sock.user.id);
      const notify = (text) => sock.sendMessage(me, { text }).catch(() => {});

      // Remove the ".vv" message so the other person doesn't see it
      sock.sendMessage(from, { delete: msg.key }).catch(() => {});

      const { item, error } = await resolveItem(sock, msg);
      if (error) return notify(error);

      try {
        const note = '👁️ View-once saved';
        await sendItem(sock, me, item, item.caption ? `${note}\n\n${item.caption}` : note);
      } catch (e) {
        logger.error(`[VV] send failed: ${e.message}`);
        notify(`❌ Forward failed: ${e.message}`);
      }
    }
  },

  /* .vv2: send it back into the current chat */
  {
    command: 'vv2',
    aliases: ['vvhere', 'reveal'],
    category: 'owner',
    description: 'Reveal a view-once in this chat',
    async run(ctx) {
      const { sock, msg } = ctx;
      attach(sock);
      if (!checkOwner(ctx)) return;

      const from = msg.key.remoteJid;
      const say = (text) => sock.sendMessage(from, { text }, { quoted: msg }).catch(() => {});

      const { item, error } = await resolveItem(sock, msg);
      if (error) return say(error);

      try {
        await sendItem(sock, from, item, item.caption || '👁️ View-once', { quoted: msg });
      } catch (e) {
        logger.error(`[VV2] send failed: ${e.message}`);
        say(`❌ Send failed: ${e.message}`);
      }
    }
  },

  /* .antiviewonce on|off */
  {
    command: 'antiviewonce',
    aliases: ['antivv', 'antivo'],
    category: 'owner',
    description: 'Auto-forward every incoming view-once to your own chat',
    async run(ctx) {
      const { sock, reply, args } = ctx;
      attach(sock);
      if (!checkOwner(ctx)) return;

      const v = (args?.[0] || '').toLowerCase();
      const bot = (await Promise.resolve(getBot())) || {};

      if (!['on', 'off'].includes(v)) {
        return reply(`👁️ Anti-ViewOnce is *${bot.antiviewonce ? 'ON ✅' : 'OFF ❌'}*\nUsage: .antiviewonce on | off`);
      }
      await Promise.resolve(setBot({ antiviewonce: v === 'on' }));
      reply(`👁️ Anti-ViewOnce is now *${v === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  }
];

// Exposed as a property on the exported array so your main file can call it at startup
module.exports.attach = attach;