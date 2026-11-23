const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');

module.exports = [
  {
    command: 'wasted',
    description: 'Apply WASTED effect to an image',
    category: 'fun',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.imageMessage) return reply('🖼️ Reply to an image.');
      const sharp = require('sharp');
      const buf = await downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      const out = await sharp(buf)
        .modulate({ brightness: 0.7, saturation: 0 })
        .tint({ r: 100, g: 0, b: 0 })
        .toBuffer();
      await sock.sendMessage(from, { image: out, caption: '💀 WASTED' }, { quoted: msg });
    }
  },
  {
    command: 'blur2',
    description: 'Blur image more',
    category: 'fun',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.imageMessage) return reply('🖼️ Reply to an image.');
      const sharp = require('sharp');
      const buf = await downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      const out = await sharp(buf).blur(20).toBuffer();
      await sock.sendMessage(from, { image: out, caption: '🌫️ Blurred' }, { quoted: msg });
    }
  },
  {
    command: 'invert',
    description: 'Invert image colors',
    category: 'fun',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.imageMessage) return reply('🖼️ Reply to an image.');
      const sharp = require('sharp');
      const buf = await downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      const out = await sharp(buf).negate().toBuffer();
      await sock.sendMessage(from, { image: out, caption: '🔄 Inverted' }, { quoted: msg });
    }
  },
  {
    command: 'grayscale',
    aliases: ['gray'],
    description: 'Convert to grayscale',
    category: 'fun',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.imageMessage) return reply('🖼️ Reply to an image.');
      const sharp = require('sharp');
      const buf = await downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      const out = await sharp(buf).grayscale().toBuffer();
      await sock.sendMessage(from, { image: out, caption: '⚫ Grayscale' }, { quoted: msg });
    }
  },
  {
    command: 'wanted',
    description: 'Wanted poster effect',
    category: 'fun',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.imageMessage) return reply('🖼️ Reply to an image.');
      const sharp = require('sharp');
      const buf = await downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      const out = await sharp(buf)
        .modulate({ brightness: 0.9, saturation: 0 })
        .tint({ r: 180, g: 140, b: 80 })
        .toBuffer();
      await sock.sendMessage(from, { image: out, caption: '🤠 WANTED' }, { quoted: msg });
    }
  },
  {
    command: 'dad',
    aliases: ['dadjoke'],
    description: 'Random dad joke',
    category: 'fun',
    async run({ reply }) {
      try {
        const { data } = await axios.get('https://icanhazdadjoke.com/', {
          headers: { Accept: 'application/json' }
        });
        reply(`👨 ${data.joke}`);
      } catch { reply('❌ Failed to get joke.'); }
    }
  },
  {
    command: 'pickup',
    description: 'Random pickup line',
    category: 'fun',
    async run({ reply }) {
      const lines = [
        "Are you a magician? Every time I look at you, everyone else disappears.",
        "Do you have a map? I keep getting lost in your eyes.",
        "Are you French? Because Eiffel for you.",
        "Are you a parking ticket? Because you've got FINE written all over you.",
        "Do you believe in love at first sight, or should I walk by again?",
        "Are you made of copper and tellurium? Because you're Cu-Te.",
        "Are you a Wi-Fi signal? Because I'm feeling a connection."
      ];
      reply(`💘 ${lines[Math.floor(Math.random() * lines.length)]}`);
    }
  },
  {
    command: 'yesno',
    aliases: ['decide'],
    description: 'Random yes/no decision',
    category: 'fun',
    async run({ reply }) {
      const answers = ['✅ YES', '❌ NO', '🤔 Maybe', '💯 Definitely', '🚫 Never', '🎲 Ask again', '💪 Absolutely'];
      reply(`🎯 *Answer:* ${answers[Math.floor(Math.random() * answers.length)]}`);
    }
  },
  {
    command: 'how',
    aliases: ['howmuch'],
    description: 'Random % rating',
    category: 'fun',
    async run({ reply, text }) {
      if (!text) return reply('📊 Example: .how smart am I');
      const pct = Math.floor(Math.random() * 101);
      const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10));
      reply(`📊 *${text}*\n${bar} *${pct}%*`);
    }
  },
  {
    command: 'truth2',
    aliases: ['truthdare'],
    description: 'Random truth or dare',
    category: 'fun',
    async run({ reply }) {
      const mode = Math.random() < 0.5 ? 'TRUTH' : 'DARE';
      const truths = [
        "What's your biggest fear?",
        "What's the most embarrassing thing you've done?",
        "Have you ever lied to your best friend?",
        "What's your secret talent?"
      ];
      const dares = [
        "Send your last selfie to this group.",
        "Sing the chorus of your favorite song in a voice note.",
        "Type your next 3 messages with eyes closed.",
        "Send a sticker representing your mood."
      ];
      const list = mode === 'TRUTH' ? truths : dares;
      const pick = list[Math.floor(Math.random() * list.length)];
      reply(`🎭 *${mode}*\n\n${pick}`);
    }
  }
];