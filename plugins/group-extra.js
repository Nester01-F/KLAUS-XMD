module.exports = [
  {
    command: 'welcome',
    description: 'Toggle welcome messages',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, args, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      // simple toggle demo (hook into DB in prod)
      reply(`👋 Welcome messages ${args[0] === 'off' ? 'disabled' : 'enabled'}.`);
    }
  },
  {
    command: 'mute',
    description: 'Mute group',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      await sock.groupSettingUpdate(from, 'announcement');
      reply('🔇 Group muted.');
    }
  },
  {
    command: 'unmute',
    description: 'Unmute group',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      await sock.groupSettingUpdate(from, 'not_announcement');
      reply('🔊 Group unmuted.');
    }
  },
  {
    command: 'linkgc',
    description: 'Get group invite link',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const code = await sock.groupInviteCode(from);
      reply(`🔗 *Group Link*\nhttps://chat.whatsapp.com/${code}`);
    }
  }
];