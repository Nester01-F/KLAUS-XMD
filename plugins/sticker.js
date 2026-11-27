const { downloadMediaMessage } = require('@whiskeysockets/baileys');

async function getBuffer(sock, msg, quoted) {
  const source = quoted ? { message: quoted, key: msg.key } : msg;
  const buf = await downloadMediaMessage(source, 'buffer', {}, {
    logger: undefined,
    reuploadRequest: sock.updateMediaMessage
  });
  if (!buf?.length) throw new Error('Empty media');
  return buf;
}

module.exports = [
  /* ============ 🖼️ STICKER (image/video → sticker) ============ */
  {
    command: 'sticker',
    aliases: ['s', 'stiker'],
    description: 'Image/Video → Sticker',
    category: 'sticker',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      const direct = msg.message.imageMessage || msg.message.videoMessage;
      if (!quoted?.imageMessage && !quoted?.videoMessage && !direct) {
        return reply('📸 Reply to an image/video or send one with `.sticker` caption');
      }

      try {
        const buf = await getBuffer(sock, msg, quoted);
        await sock.sendMessage(from, {
          sticker: buf,
          packname: 'KLAUS XMD',
          author: 'Warrior Felix'
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Sticker failed: ${e.message}`);
      }
    }
  },

  /* ============ 🖼️ TOIMG (sticker → image) ============ */
  {
    command: 'toimg',
    aliases: ['tophoto'],
    description: 'Sticker → Image',
    category: 'sticker',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.stickerMessage) return reply('🖼️ Reply to a sticker.');

      try {
        const buf = await getBuffer(sock, msg, quoted);
        await sock.sendMessage(from, {
          image: buf,
          caption: '✅ KLAUS XMD'
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ============ 🎬 TOVID (sticker → video) ============ */
  {
    command: 'tovid',
    aliases: ['stk2vid'],
    description: 'Sticker → Video',
    category: 'sticker',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.stickerMessage) return reply('🎬 Reply to an animated sticker.');

      try {
        const buf = await getBuffer(sock, msg, quoted);
        await sock.sendMessage(from, {
          video: buf,
          caption: '🎬 KLAUS XMD'
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  }
];