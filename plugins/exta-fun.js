cat > plugins/extra-fun.js << 'EOF'
const axios = require('axios');

module.exports = [
  {
    command: 'hug', description: 'Send a hug', category: 'fun',
    async run({ sock, from, msg, reply }) {
      const t = msg.message.extendedTextMessage?.contextInfo?.participant;
      if (!t) return reply('🤗 Hug who? Reply to someone.');
      await sock.sendMessage(from, {
        text: `🤗 @${t.split('@')[0]} received a hug from @${msg.key.participant.split('@')[0]}!`,
        mentions: [t, msg.key.participant]
      }, { quoted: msg });
    }
  },
  {
    command: 'slap', description: 'Slap someone', category: 'fun',
    async run({ sock, from, msg, reply }) {
      const t = msg.message.extendedTextMessage?.contextInfo?.participant;
      if (!t) return reply('👋 Slap who? Reply to someone.');
      await sock.sendMessage(from, {
        text: `💥 @${t.split('@')[0]} got slapped! 👋`,
        mentions: [t]
      }, { quoted: msg });
    }
  },
  {
    command: 'pat', description: 'Pat someone', category: 'fun',
    async run({ sock, from, msg, reply }) {
      const t = msg.message.extendedTextMessage?.contextInfo?.participant;
      if (!t) return reply('🫂 Pat who? Reply to someone.');
      await sock.sendMessage(from, {
        text: `🫂 @${t.split('@')[0]} is patted softly 🥰`,
        mentions: [t]
      }, { quoted: msg });
    }
  },
  {
    command: 'kiss', description: 'Send a kiss', category: 'fun',
    async run({ sock, from, msg, reply }) {
      const t = msg.message.extendedTextMessage?.contextInfo?.participant;
      if (!t) return reply('😘 Kiss who? Reply to someone.');
      await sock.sendMessage(from, {
        text: `😘 @${t.split('@')[0]} got a kiss! 💋`,
        mentions: [t]
      }, { quoted: msg });
    }
  },
  {
    command: 'rate', description: 'Rate something 1–10', category: 'fun',
    async run({ reply, text }) {
      if (!text) return reply('⭐ Example: .rate pizza');
      const score = Math.floor(Math.random() * 10) + 1;
      const stars = '⭐'.repeat(Math.ceil(score / 2));
      reply(`⭐ *${text}*\n📊 Score: *${score}/10*\n${stars}`);
    }
  },
  {
    command: 'compliment', description: 'Random compliment', category: 'fun',
    async run({ reply }) {
      const list = [
        'You light up every room you enter! 🌟',
        'Your smile is contagious! 😊',
        'You are stronger than you know 💪',
        'You make the world a better place ❤️',
        'You are truly one of a kind ✨'
      ];
      reply(`💖 ${list[Math.floor(Math.random() * list.length)]}`);
    }
  },
  {
    command: 'roast', description: 'Roast someone (light)', category: 'fun',
    async run({ sock, from, msg, reply }) {
      const t = msg.message.extendedTextMessage?.contextInfo?.participant;
      if (!t) return reply('🔥 Roast who? Reply to someone.');
      const list = [
        'You are the reason shampoo has instructions',
        'You bring everyone joy... when you leave',
        'Your secrets are safe with me — I wasnt listening',
        'You are like a cloud — when you disappear its a beautiful day',
        'If laziness were an Olympic sport, you d get silver — you didnt try hard enough for gold'
      ];
      await sock.sendMessage(from, {
        text: `🔥 @${t.split('@')[0]} ${list[Math.floor(Math.random() * list.length)]}`,
        mentions: [t]
      }, { quoted: msg });
    }
  },
  {
    command: 'truth', description: 'Truth question', category: 'fun',
    async run({ reply }) {
      const list = [
        'Whats the most embarrassing thing you ve done?',
        'What is your biggest fear?',
        'Whats a secret you ve never told anyone?',
        'What was your last lie?',
        'Who do you secretly dislike?'
      ];
      reply(`🎭 *TRUTH*\n\n${list[Math.floor(Math.random() * list.length)]}`);
    }
  },
  {
    command: 'dare', description: 'Dare challenge', category: 'fun',
    async run({ reply }) {
      const list = [
        'Send your most recent selfie 📸',
        'Type your next message with your eyes closed',
        'Send a voice note singing 🎤',
        'Tell us your crush s name 😳',
        'Send a screenshot of your last chat 📱'
      ];
      reply(`🔥 *DARE*\n\n${list[Math.floor(Math.random() * list.length)]}`);
    }
  },
  {
    command: 'wyr', description: 'Would you rather', category: 'fun',
    async run({ reply }) {
      const list = [
        ['Be rich but alone', 'Be poor but loved'],
        ['Never sleep again', 'Never eat again'],
        ['Live without music', 'Live without movies'],
        ['Be able to fly', 'Be able to teleport'],
        ['Always be 10 minutes late', 'Always be 20 minutes early']
      ];
      const pick = list[Math.floor(Math.random() * list.length)];
      reply(`🤔 *WOULD YOU RATHER?*\n\n🅰️ ${pick[0]}\n\n🆚\n\n🅱️ ${pick[1]}`);
    }
  }
];
