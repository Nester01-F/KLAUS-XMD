cat > plugins/media.js << 'EOF'
const { getBuffer } = require('../lib/helper');

module.exports = [
  {
    command: 'toaudio',
    aliases: ['tomp3', 'tovoice'],
    description: 'Convert video to audio',
    category: 'media',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.videoMessage) return reply('🎬 Reply to a video.');
      const buf = await sock.downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      await sock.sendMessage(from, { audio: buf, mimetype: 'audio/mp4' }, { quoted: msg });
    }
  },
  {
    command: 'tovid',
    aliases: ['tovideo'],
    description: 'Convert audio to video',
    category: 'media',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.audioMessage) return reply('🎵 Reply to an audio message.');
      reply('🎬 Converting... (needs ffmpeg on host)');
      // Placeholder for ffmpeg conversion — implement with fluent-ffmpeg
    }
  },
  {
    command: 'togif',
    description: 'Convert video to GIF',
    category: 'media',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.videoMessage) return reply('🎬 Reply to a video.');
      const buf = await sock.downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      await sock.sendMessage(from, { video: buf, gifPlayback: true, caption: '🎞️ KLAUS XMD' }, { quoted: msg });
    }
  },
  {
    command: 'resize',
    description: 'Resize an image',
    category: 'media',
    async run({ sock, msg, from, reply, args }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.imageMessage) return reply('🖼️ Reply to an image.');
      const size = parseInt(args[0]) || 500;
      const sharp = require('sharp');
      const buf = await sock.downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      const out = await sharp(buf).resize(size, size).toBuffer();
      await sock.sendMessage(from, { image: out, caption: `✅ Resized to ${size}x${size}` }, { quoted: msg });
    }
  },
  {
    command: 'rotate',
    description: 'Rotate an image',
    category: 'media',
    async run({ sock, msg, from, reply, args }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.imageMessage) return reply('🖼️ Reply to an image.');
      const deg = parseInt(args[0]) || 90;
      const sharp = require('sharp');
      const buf = await sock.downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      const out = await sharp(buf).rotate(deg).toBuffer();
      await sock.sendMessage(from, { image: out, caption: `🔃 Rotated ${deg}°` }, { quoted: msg });
    }
  },
  {
    command: 'compress',
    description: 'Compress an image',
    category: 'media',
    async run({ sock, msg, from, reply, args }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.imageMessage) return reply('🖼️ Reply to an image.');
      const quality = Math.min(Math.max(parseInt(args[0]) || 70, 10), 100);
      const sharp = require('sharp');
      const buf = await sock.downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      const out = await sharp(buf).jpeg({ quality }).toBuffer();
      await sock.sendMessage(from, {
        image: out, caption: `✅ Compressed to ${quality}%`
      }, { quoted: msg });
    }
  }
];
