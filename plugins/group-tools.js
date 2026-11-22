module.exports = [
  {
    command: 'demote',
    description: 'Demote an admin to member',
    category: 'group',
    admin: true,
    async run({ sock, from, msg, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const isAdm = meta.participants.find(p => p.id === sender)?.admin;
      if (!isAdm && !config.owner.includes(sender.split('@')[0])) return reply('❌ Admin only.');

      const target = msg.message.extendedTextMessage?.contextInfo?.participant;
      if (!target) return reply('👤 Reply to an admin to demote.');
      await sock.groupParticipantsUpdate(from, [target], 'demote');
      reply(`⬇️ @${target.split('@')[0]} demoted to member.`, { mentions: [target] });
    }
  },
  {
    command: 'resetwarnall',
    aliases: ['clearwarns'],
    description: 'Reset all warnings in group',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const isAdm = meta.participants.find(p => p.id === sender)?.admin;
      if (!isAdm && !config.owner.includes(sender.split('@')[0])) return reply('❌ Admin only.');

      const { setGroup } = require('../lib/database');
      setGroup(from, { warnings: {}, warnLog: [] });
      reply('✅ All warnings cleared.');
    }
  },
  {
    command: 'warnlist',
    aliases: ['warns'],
    description: 'List members with warnings',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const { getGroup } = require('../lib/database');
      const g = getGroup(from);
      const warns = Object.entries(g.warnings || {}).filter(([, count]) => count > 0);
      if (!warns.length) return reply('✅ No warnings in this group.');
      const list = warns.map(([jid, count], i) =>
        `${i + 1}. @${jid.split('@')[0]} — *${count}/3* ⚠️`
      ).join('\n');
      await sock.sendMessage(from, {
        text: `⚠️ *WARNINGS (${warns.length})*\n━━━━━━━━━━━━━━━\n${list}`,
        mentions: warns.map(([jid]) => jid)
      });
    }
  },
  {
    command: 'hidetag',
    aliases: ['ht'],
    description: 'Send message tagging everyone silently',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, text, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const mentions = meta.participants.map(p => p.id);
      await sock.sendMessage(from, {
        text: text || '📢',
        mentions
      });
    }
  },
  {
    command: 'tagadmin',
    aliases: ['tagadmins'],
    description: 'Tag all admins',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, text, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const admins = meta.participants.filter(p => p.admin).map(p => p.id);
      if (!admins.length) return reply('👑 No admins.');
      const list = admins.map(j => `@${j.split('@')[0]}`).join(' ');
      await sock.sendMessage(from, {
        text: `👑 *ADMINS*\n${text || 'Attention please!'}\n\n${list}`,
        mentions: admins
      });
    }
  },
  {
    command: 'tagall2',
    aliases: ['everyone'],
    description: 'Tag everyone (alternative)',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, text, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const mentions = meta.participants.map(p => p.id);
      const lines = mentions.map(j => `@${j.split('@')[0]}`).join('\n');
      await sock.sendMessage(from, {
        text: `📢 *${text || 'Attention everyone!'}*\n\n${lines}`,
        mentions
      });
    }
  },
  {
    command: 'poll',
    description: 'Create a poll',
    category: 'group',
    async run({ sock, from, reply, text, msg }) {
      const parts = text.split('|').map(s => s.trim()).filter(Boolean);
      if (parts.length < 3) return reply('📊 Example: .poll Best fruit? | Apple | Banana | Mango');
      const [question, ...options] = parts;
      await sock.sendMessage(from, {
        poll: { name: question, values: options, selectableCount: 1 }
      }, { quoted: msg });
    }
  },
  {
    command: 'ginfo2',
    aliases: ['ginvite'],
    description: 'Get group invite link',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const code = await sock.groupInviteCode(from);
      reply(`🔗 *Group Invite*\nhttps://chat.whatsapp.com/${code}`);
    }
  },
  {
    command: 'whois2',
    aliases: ['userinfo2'],
    description: 'Detailed user info in group',
    category: 'group',
    async run({ sock, msg, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const target = msg.message.extendedTextMessage?.contextInfo?.participant ||
        (msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [])[0];
      if (!target) return reply('👤 Reply to or mention someone.');

      const meta = await sock.groupMetadata(from);
      const p = meta.participants.find(x => x.id === target);
      const { getUser } = require('../lib/database');
      const u = getUser(target);
      const joined = p ? 'in group' : 'not found';
      reply(
`👤 *USER INFO*
━━━━━━━━━━━━━━━
📱 Number: *@${target.split('@')[0]}*
👑 Role  : *${p?.admin || 'member'}*
📛 Name  : *${u.name || 'unknown'}*
⚠️ Warns : *${u.warnings || 0}*
📍 Status: *${joined}*`,
        { mentions: [target] }
      );
    }
  }
];