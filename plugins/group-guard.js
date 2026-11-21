const { getGroup, setGroup, resetWarnings, getWarnings } = require('../lib/database');
const { isAdmin } = require('../lib/guard');

module.exports = [
  {
    command: 'antilink',
    description: 'Enable/disable antilink',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender))) return reply('❌ Admin only.');
      const mode = args[0]?.toLowerCase();
      if (!['on','off'].includes(mode)) return reply('🛡️ Usage: .antilink on | off');
      setGroup(from, { antilink: mode === 'on' });
      reply(`🛡️ *Antilink ${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  },
  {
    command: 'antispam',
    description: 'Enable/disable antispam',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender))) return reply('❌ Admin only.');
      const mode = args[0]?.toLowerCase();
      if (!['on','off'].includes(mode)) return reply('🚫 Usage: .antispam on | off');
      setGroup(from, { antispam: mode === 'on' });
      reply(`🚫 *Antispam ${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  },
  {
    command: 'warnings',
    description: 'Check a member warnings',
    category: 'group',
    async run({ sock, msg, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const target = msg.message.extendedTextMessage?.contextInfo?.participant ||
        (msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [])[0];
      if (!target) return reply('👤 Reply to or mention someone.');
      const w = getWarnings(from, target);
      reply(`⚠️ *@${target.split('@')[0]}* has *${w}/3* warnings.`, { mentions: [target] });
    }
  },
  {
    command: 'resetwarn',
    description: 'Reset a member warnings',
    category: 'group',
    admin: true,
    async run({ sock, msg, from, reply, isGroup, sender }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender))) return reply('❌ Admin only.');
      const target = msg.message.extendedTextMessage?.contextInfo?.participant ||
        (msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [])[0];
      if (!target) return reply('👤 Reply to or mention someone.');
      resetWarnings(from, target);
      reply(`✅ Warnings cleared for @${target.split('@')[0]}`, { mentions: [target] });
    }
  },
  {
    command: 'guardstatus',
    description: 'Show guard status',
    category: 'group',
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const g = getGroup(from);
      reply(
`🛡️ *GUARD STATUS*
━━━━━━━━━━━━━━━
🔗 Antilink : *${g.antilink ? 'ON ✅' : 'OFF ❌'}*
🚫 Antispam : *${g.antispam ? 'ON ✅' : 'OFF ❌'}*
👋 Welcome  : *${g.welcome ? 'ON ✅' : 'OFF ❌'}*
👋 Goodbye  : *${g.goodbye ? 'ON ✅' : 'OFF ❌'}*`
      );
    }
  },
  {
    command: 'welcome',
    description: 'Toggle welcome messages',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender))) return reply('❌ Admin only.');
      const mode = args[0]?.toLowerCase();
      if (!['on','off'].includes(mode)) return reply('👋 Usage: .welcome on | off');
      setGroup(from, { welcome: mode === 'on' });
      reply(`👋 *Welcome messages ${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  },
  {
    command: 'goodbye',
    description: 'Toggle goodbye messages',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender))) return reply('❌ Admin only.');
      const mode = args[0]?.toLowerCase();
      if (!['on','off'].includes(mode)) return reply('👋 Usage: .goodbye on | off');
      setGroup(from, { goodbye: mode === 'on' });
      reply(`👋 *Goodbye messages ${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  }
];