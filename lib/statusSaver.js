const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { getBot } = require('./database');
const logger = require('./logger');

const STATUS_DIR = path.join(__dirname, '../status');
if (!fs.existsSync(STATUS_DIR)) fs.mkdirSync(STATUS_DIR, { recursive: true });

async function saveStatus(sock, msg) {
  const bot = getBot();
  if (!bot.autosavestatus) return;

  const m = msg.message;
  const isImage = m?.imageMessage;
  const isVideo = m?.videoMessage;

  if (!isImage && !isVideo) return;

  const sender = (msg.key.participant || msg.key.remoteJid).split('@')[0];
  const ts = Date.now();
  const ext = isVideo ? 'mp4' : 'jpg';
  const filename = `${sender}_${ts}.${ext}`;
  const filepath = path.join(STATUS_DIR, filename);

  try {
    const buf = await downloadMediaMessage(msg, 'buffer', {}, {});
    fs.writeFileSync(filepath, buf);
    logger.info(`💾 Status saved: ${filename} (${(buf.length / 1024).toFixed(1)} KB)`);

    const config = require('../config');
    const owner = config.owner[0] + '@s.whatsapp.net';
    await sock.sendMessage(owner, isVideo
      ? { video: buf, caption: `💾 Status from *@${sender}* saved to bot` }
      : { image: buf, caption: `💾 Status from *@${sender}* saved to bot` }
    ).catch(() => {});
  } catch (e) {
    logger.warn(`Status save failed: ${e.message}`);
  }
}

function listSavedStatuses() {
  return fs.readdirSync(STATUS_DIR).map(f => ({
    name: f,
    size: fs.statSync(path.join(STATUS_DIR, f)).size,
    path: path.join(STATUS_DIR, f)
  })).sort((a, b) => b.size - a.size);
}

function clearStatuses() {
  fs.readdirSync(STATUS_DIR).forEach(f => {
    fs.unlinkSync(path.join(STATUS_DIR, f));
  });
}

module.exports = { saveStatus, listSavedStatuses, clearStatuses, STATUS_DIR };