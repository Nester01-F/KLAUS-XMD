const moment = require('moment-timezone');
const { getUser, setUser } = require('../lib/database');

module.exports = [
  {
    command: 'afk',
    description: 'Set yourself AFK',
    category: 'utility',
    async run({ reply, text, sender }) {
      const reason = text || 'AFK';
      setUser(sender, { afk: Date.now(), afkReason: reason });
      reply(`😴 You are now AFK.\n📝 Reason: *${reason}*\n\nOthers will see this when they mention you.`);
    }
  },
  {
    command: 'back',
    aliases: ['unafk'],
    description: 'Return from AFK',
    category: 'utility',
    async run({ reply, sender }) {
      const u = getUser(sender);
      if (!u.afk) return reply("🙂 You weren't AFK.");
      const since = Math.floor((Date.now() - u.afk) / 60000);
      setUser(sender, { afk: null, afkReason: '' });
      reply(`👋 Welcome back! You were AFK for *${since} minutes*.`);
    }
  },
  {
    command: 'remind',
    aliases: ['reminder'],
    description: 'Set a reminder',
    category: 'utility',
    async run({ sock, from, reply, args, msg }) {
      const time = parseInt(args[0]);
      const unit = args[1]?.toLowerCase();
      const task = args.slice(2).join(' ');
      if (!time || !task) return reply('⏰ Example: .remind 5 min drink water');

      const units = { sec: 1000, s: 1000, min: 60000, m: 60000, hr: 3600000, h: 3600000 };
      const ms = time * (units[unit] || 60000);

      reply(`⏰ Reminder set for *${time} ${unit}* → _${task}_`);

      setTimeout(() => {
        sock.sendMessage(from, {
          text: `🔔 *REMINDER*\n\n@${msg.key.participant?.split('@')[0] || 'you'}\n⏰ ${task}`,
          mentions: msg.key.participant ? [msg.key.participant] : []
        }, { quoted: msg }).catch(() => {});
      }, ms);
    }
  },
  {
    command: 'poll',
    description: 'Create a poll',
    category: 'utility',
    async run({ sock, from, reply, text, msg }) {
      const parts = text.split('|').map(s => s.trim());
      if (parts.length < 3) return reply('📊 Example: .poll Best fruit? | Apple | Banana | Mango');
      const question = parts[0];
      const options = parts.slice(1);
      await sock.sendMessage(from, {
        poll: { name: question, values: options, selectableCount: 1 }
      }, { quoted: msg });
    }
  },
  {
    command: 'countdown',
    description: 'Countdown timer',
    category: 'utility',
    async run({ sock, from, reply, args, msg }) {
      const sec = parseInt(args[0]) || 5;
      if (sec > 60) return reply('⏱️ Max 60 seconds.');
      const m = await sock.sendMessage(from, { text: `⏳ Counting down ${sec}s...` }, { quoted: msg });
      for (let i = sec; i > 0; i--) {
        await new Promise(r => setTimeout(r, 1000));
        await sock.sendMessage(from, { text: `⏱️ ${i}...`, edit: m.key });
      }
      await sock.sendMessage(from, { text: '🎉 Done!', edit: m.key });
    }
  },
  {
    command: 'base64',
    aliases: ['b64'],
    description: 'Encode text to Base64',
    category: 'utility',
    async run({ reply, text }) {
      if (!text) return reply('🔐 Example: .base64 hello');
      reply(`📦 \`${Buffer.from(text).toString('base64')}\``);
    }
  },
  {
    command: 'decode',
    description: 'Decode Base64 text',
    category: 'utility',
    async run({ reply, text }) {
      if (!text) return reply('🔓 Example: .decode aGVsbG8=');
      try {
        reply(`📦 \`${Buffer.from(text, 'base64').toString('utf8')}\``);
      } catch { reply('❌ Invalid Base64.'); }
    }
  }
];
