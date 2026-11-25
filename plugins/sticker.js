const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');

const API = 'https://apix.wolvarex.com';
const KEY = process.env.WOLVAREX_KEY || 'wxa_f_29f9cb9803';

async function convert(buf, endpoint, contentType) {
  const form = new FormData();
  form.append('file', buf, { filename: 'media', contentType });

  const { data } = await axios.post(
    `${API}${endpoint}?key=${KEY}`,
    form,
    { headers: form.getHeaders(), timeout: 30000, responseType: 'arraybuffer' }
  );
  return Buffer.from(data);
}

module.exports = [
  {
    command: 'sticker',
    aliases: ['s', 'stiker'],
    description: 'Image/Video → Sticker (Wolvarex)',
    category: 'sticker',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      const direct = msg.message.imageMessage || msg.message.videoMessage;
      if (!quoted?.imageMessage && !quoted?.videoMessage && !direct) {
        return reply('📸 Reply to an image/video or send one with `.sticker` caption');
      }

      try {
        const source = quoted ? { message: quoted, key: msg.key } : msg;
        const buf = await downloadMediaMessage(source, 'buffer', {}, {
          logger: undefined,
          reuploadRequest: sock.updateMediaMessage
        });
        if (!buf?.length) throw new Error('Empty media');

        const isVideo = !!(quoted?.videoMessage || direct?.videoMessage);
        const contentType = isVideo ? 'video/mp4' : 'image/jpeg';
        const stickerBuf = await convert(buf, '/api/converter/img-to-sticker', contentType);

        await sock.sendMessage(from, {
          sticker: stickerBuf,
          packname: 'KLAUS XMD',
          author: 'Warrior Felix'
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Sticker failed: ${e.message}`);
      }
    }
  },
  {
    command: 'toimg',
    aliases: ['tophoto'],
    description: 'Sticker → Image (Wolvarex)',
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
        const imgBuf = await convert(buf, '/api/converter/sticker-to-img', 'image/webp');
        await sock.sendMessage(from, { image: imgBuf, caption: '✅ KLAUS XMD' }, { quoted: msg });
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },
  {
    command: 'tovid',
    aliases: ['stk2vid'],
    description: 'Sticker → Video (Wolvarex)',
    category: 'sticker',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.stickerMessage) return reply('🎬 Reply to an animated sticker.');
      try {
        const buf = await downloadMediaMessage(
          { message: quoted, key: msg.key },
          'buffer',
          {},
          { logger: undefined, reuploadRequest: sock.updateMediaMessage }
        );
        const vidBuf = await convert(buf, '/api/converter/sticker-to-video', 'image/webp');
        await sock.sendMessage(from, { video: vidBuf, caption: '🎬 KLAUS XMD' }, { quoted: msg });
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  }
];