const { downloadMediaMessage } = require('@whiskeysockets/baileys');

async function makeSticker(sock, msg, quoted, from) {
  const source = quoted ? { message: quoted, key: msg.key } : msg;
  const buf = await downloadMediaMessage(source, 'buffer', {}, {
    logger: undefined,
    reuploadRequest: sock.updateMediaMessage
  });
  await sock.sendMessage(from, {
    sticker: buf,
    packname: 'KLAUS XMD',
    author: 'Warrior Felix'
  }, { quoted: msg });
}

module.exports = [
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
        await makeSticker(sock, msg, quoted, from);
      } catch (e) {
        reply(`❌ Sticker failed: ${e.message}`);
      }
    }
  },
  {
    command: 'toimg',
    aliases: ['tophoto'],
    description: 'Sticker → Image',
    category: 'sticker',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.stickerMessage) return reply('🖼️ Reply to a sticker.');
      try {
        const buf = await downloadMediaMessage(
          { message: quoted, key: msg.key },
          'buffer',
          {},
          { logger: undefined, reuploadRequest: sock.updateMediaMessage }
        );
        await sock.sendMessage(from, { image: buf, caption: '✅ KLAUS XMD' }, { quoted: msg });
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  }
];