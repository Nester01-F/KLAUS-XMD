const { getBuffer } = require('../lib/helper');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

async function makeSticker(media, opts = {}) {
  const buf = await getBuffer(media);
  const st = new Sticker(buf, {
    pack: 'KLAUS XMD',
    author: 'KLAUS TECH',
    type: StickerTypes.FULL,
    quality: 80,
    ...opts
  });
  return await st.toBuffer();
}

module.exports = [
  {
    command: 'sticker',
    aliases: ['s'],
    description: 'Image/Video → Sticker',
    category: 'sticker',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      const m = quoted || msg.message;
      const img = m.imageMessage || m.videoMessage;
      if (!img) return reply('📸 Reply to an image/video or send one with caption.');

      const buf = await sock.downloadMediaMessage(
        quoted ? { message: quoted } : msg,
        'buffer', {}, {}
      );
      const sticker = await makeSticker(buf);
      await sock.sendMessage(from, { sticker }, { quoted: msg });
    }
  },
  {
    command: 'toimg',
    description: 'Sticker → Image',
    category: 'sticker',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.stickerMessage) return reply('🖼️ Reply to a sticker.');
      const buf = await sock.downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      await sock.sendMessage(from, { image: buf, caption: '✅ By KLAUS XMD' }, { quoted: msg });
    }
  }
];