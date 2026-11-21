async function isAdmin(sock, groupId, jid) {
  const meta = await sock.groupMetadata(groupId);
  return meta.participants.find(p => p.id === jid)?.admin != null;
}

module.exports = [
  {
    command: 'kick',
    description: 'Kick a member',
    category: 'group',
    admin: true,
    async run({ sock, from, msg, reply, isGroup, sender }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender))) return reply('❌ Admin only.');
      const target = msg.message.extendedTextMessage?.contextInfo?.participant;
      if (!target) return reply('👤 Reply to someone.');
      await sock.groupParticipantsUpdate(from, [target], 'remove');
      reply('✅ Kicked.');
    }
  },
  {
    command: 'promote',
    description: 'Promote to admin',
    category: 'group',
    admin: true,
    async run({ sock, from, msg, reply, isGroup, sender }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender))) return reply('❌ Admin only.');
      const target = msg.message.extendedTextMessage?.contextInfo?.participant;
      if (!target) return reply('👤 Reply to someone.');
      await sock.groupParticipantsUpdate(from, [target], 'promote');
      reply('✅ Promoted.');
    }
  },
  {
    command: 'tagall',
    description: 'Tag everyone',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, text, isGroup, sender }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender))) return reply('❌ Admin only.');
      const meta = await sock.groupMetadata(from);
      const mentions = meta.participants.map(p => p.id);
      const list = mentions.map(j => `@${j.split('@')[0]}`).join('\n');
      await sock.sendMessage(from, {
        text: `📢 *${text || 'Announcement'}*\n\n${list}`,
        mentions
      });
    }
  }
];