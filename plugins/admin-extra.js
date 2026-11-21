cat > plugins/admin-extra.js << 'EOF'
const { getGroup, setGroup, addWarning } = require('../lib/database');

module.exports = [
  {
    command: 'warn',
    description: 'Warn a user',
    category: 'admin',
    admin: true,
    async run({ sock, msg, from, reply, isGroup, sender, args }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const isAdm = meta.participants.find(p => p.id === sender)?.admin;
      if (!isAdm) return reply('❌ Admin only.');

      const target = msg.message.extendedTextMessage?.contextInfo?.participant;
      if (!target) return reply('👤 Reply to someone.');
      const reason = args.join(' ') || 'no reason';
      const count = addWarning(from, target, reason);
      await sock.sendMessage(from, {
        text: `⚠️ *@${target.split('@')[0]}* warned!\nReason: ${reason}\nWarnings: *${count}/3*`,
        mentions: [target]
      });
    }
  },
  {
    command: 'antibot',
    description: 'Toggle antibot',
    category: 'admin',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const isAdm = meta.participants.find(p => p.id === sender)?.admin;
      if (!isAdm) return reply('❌ Admin only.');
      const mode = args[0]?.toLowerCase();
      setGroup(from, { antibot: mode === 'on' });
      reply(`🤖 Antibot *${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  },
  {
    command: 'antidelete',
    description: 'Toggle antidelete (logs deleted msgs)',
    category: 'admin',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const isAdm = meta.participants.find(p => p.id === sender)?.admin;
      if (!isAdm) return reply('❌ Admin only.');
      const mode = args[0]?.toLowerCase();
      setGroup(from, { antidelete: mode === 'on' });
      reply(`🗑️ Antidelete *${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  },
  {
    command: 'setwelcome',
    description: 'Set welcome message',
    category: 'admin',
    admin: true,
    async run({ reply, text, from, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!text) return reply('👋 Example: .setwelcome Welcome @user to @group!');
      setGroup(from, { welcomeMsg: text });
      reply('✅ Welcome message updated.\n💡 Use `@user` and `@group` as placeholders.');
    }
  },
  {
    command: 'setgoodbye',
    description: 'Set goodbye message',
    category: 'admin',
    admin: true,
    async run({ reply, text, from, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!text) return reply('👋 Example: .setgoodbye Goodbye @user!');
      setGroup(from, { goodbyeMsg: text });
      reply('✅ Goodbye message updated.');
    }
  }
];
