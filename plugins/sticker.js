const { getBuffer } = require('../lib/helper');

async function makeSticker(sock, msg, quoted, packName = 'KLAUS XMD', author = 'Warrior Felix') {
  const source = quoted ? { message: quoted } : msg;
  const buf = await sock.downloadMediaMessage(source, 'buffer', {}, {});

  // Determine mimetype
  const m = quoted || msg.message;
  const isVideo = !!m.videoMessage;
  const mimetype = isVideo ? 'video/mp4' : 'image/jpeg';

  // Use Baileys native sticker support
  return sock.sendMessage(msg.key.remoteJid, {
    sticker: buf,
    mimetype,
    packname: packName,
    author
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
        return reply('📸 Reply to an image/video or send one with caption `.sticker`');
      }

      await reply('🎨 Creating sticker...');
      try {
        await makeSticker(sock, msg, quoted, 'KLAUS XMD', 'Warrior Felix');
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
        const buf = await sock.downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
        await sock.sendMessage(from, {
          image: buf,
          caption: '✅ By KLAUS XMD'
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  }
];