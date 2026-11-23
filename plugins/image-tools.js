const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');

module.exports = [
  {
    command: 'removebg',
    description: 'Remove image background',
    category: 'tools',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.imageMessage) return reply('🖼️ Reply to an image.');
      const buf = await downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      try {
        const fd = new (require('form-data'))();
        fd.append('image_file', buf, { filename: 'img.png' });
        const { data } = await axios.post('https://api.remove.bg/v1.0/removebg', fd, {
          headers: { ...fd.getHeaders(), 'X-Api-Key': 'YOUR_KEY' },
          responseType: 'arraybuffer'
        });
        await sock.sendMessage(from, { image: Buffer.from(data) }, { quoted: msg });
      } catch { reply('❌ Failed. Add your remove.bg API key.'); }
    }
  },
  {
    command: 'blur',
    description: 'Blur an image',
    category: 'tools',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.imageMessage) return reply('🖼️ Reply to an image.');
      const sharp = require('sharp');
      const buf = await downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      const out = await sharp(buf).blur(12).toBuffer();
      await sock.sendMessage(from, { image: out, caption: '🌫️ Blurred by KLAUS XMD' }, { quoted: msg });
    }
  },
  {
    command: 'meme',
    description: 'Random meme',
    category: 'fun',
    async run({ sock, from, reply }) {
      try {
        const { data } = await axios.get('https://meme-api.com/gimme');
        await sock.sendMessage(from, { image: { url: data.url }, caption: `😂 ${data.title}` });
      } catch { reply('❌ Meme failed.'); }
    }
  }
];