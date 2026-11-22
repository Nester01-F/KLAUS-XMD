const { getGroup, setGroup } = require('../lib/database');

module.exports = [
  {
    command: 'groupstatus',
    aliases: ['gstatus', 'groupstats'],
    description: 'Show full group status',
    category: 'group',
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const g = getGroup(from);
      const admins = meta.participants.filter(p => p.admin).length;
      const members = meta.participants.length - admins;
      const created = new Date(meta.creation * 1000).toLocaleDateString();

      reply(
`📊 *GROUP STATUS*
━━━━━━━━━━━━━━━━
📛 *${meta.subject}*
👥 Members : *${meta.participants.length}*
👑 Admins  : *${admins}*
👤 Regular : *${members}*
📅 Created : *${created}*
🔒 Restricted: *${meta.announce ? 'YES' : 'NO'}*

🛡️ *Guard*
🔗 Antilink  : *${g.antilink ? 'ON ✅' : 'OFF ❌'}*
🚫 Antispam  : *${g.antispam ? 'ON ✅' : 'OFF ❌'}*
🤖 Antibot   : *${g.antibot ? 'ON ✅' : 'OFF ❌'}*
👋 Welcome   : *${g.welcome ? 'ON ✅' : 'OFF ❌'}*

⚠️ Total warnings: *${Object.keys(g.warnings || {}).length}*`
      );
    }
  },
  {
    command: 'admins',
    aliases: ['listadmins'],
    description: 'List group admins',
    category: 'group',
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const admins = meta.participants.filter(p => p.admin);
      if (!admins.length) return reply('👑 No admins found.');
      const list = admins.map((a, i) =>
        `${i + 1}. @${a.id.split('@')[0]} ${a.admin === 'superadmin' ? '(👑 Owner)' : ''}`
      ).join('\n');
      await sock.sendMessage(from, {
        text: `👑 *GROUP ADMINS (${admins.length})*\n━━━━━━━━━━━━━━━\n${list}`,
        mentions: admins.map(a => a.id)
      });
    }
  },
  {
    command: 'members',
    aliases: ['listmembers'],
    description: 'List group members',
    category: 'group',
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      if (meta.participants.length > 50) {
        return reply(`👥 Group has *${meta.participants.length}* members.\nToo many to list. Use .admins for admins only.`);
      }
      const list = meta.participants.map((p, i) =>
        `${i + 1}. @${p.id.split('@')[0]} ${p.admin ? '👑' : ''}`
      ).join('\n');
      await sock.sendMessage(from, {
        text: `👥 *MEMBERS (${meta.participants.length})*\n━━━━━━━━━━━━━━━\n${list}`,
        mentions: meta.participants.map(p => p.id)
      });
    }
  },
  {
    command: 'groupdesc',
    aliases: ['gdesc'],
    description: 'Show group description',
    category: 'group',
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      reply(`📝 *GROUP DESCRIPTION*\n━━━━━━━━━━━━━━━\n${meta.desc || '_No description set._'}`);
    }
  },
  {
    command: 'setdesc',
    description: 'Set group description',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, text, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const isAdm = meta.participants.find(p => p.id === sender)?.admin;
      if (!isAdm && !config.owner.includes(sender.split('@')[0])) return reply('❌ Admin only.');
      if (!text) return reply('📝 Example: .setdesc Welcome to our group!');
      await sock.groupUpdateDescription(from, text);
      reply('✅ Group description updated.');
    }
  },
  {
    command: 'setsubject',
    aliases: ['setname2', 'gname'],
    description: 'Set group subject/name',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, text, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const isAdm = meta.participants.find(p => p.id === sender)?.admin;
      if (!isAdm && !config.owner.includes(sender.split('@')[0])) return reply('❌ Admin only.');
      if (!text) return reply('📛 Example: .setsubject My Group Name');
      await sock.groupUpdateSubject(from, text);
      reply(`✅ Group name updated to *${text}*`);
    }
  },
  {
    command: 'resetlink',
    aliases: ['revoke'],
    description: 'Reset group invite link',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const isAdm = meta.participants.find(p => p.id === sender)?.admin;
      if (!isAdm && !config.owner.includes(sender.split('@')[0])) return reply('❌ Admin only.');
      await sock.groupRevokeInvite(from);
      const code = await sock.groupInviteCode(from);
      reply(`🔄 Link reset!\n\n🔗 https://chat.whatsapp.com/${code}`);
    }
  },
  {
    command: 'lock',
    aliases: ['closegc'],
    description: 'Lock group (admins only can send)',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const isAdm = meta.participants.find(p => p.id === sender)?.admin;
      if (!isAdm && !config.owner.includes(sender.split('@')[0])) return reply('❌ Admin only.');
      await sock.groupSettingUpdate(from, 'announcement');
      reply('🔒 *Group LOCKED* — only admins can send messages.');
    }
  },
  {
    command: 'unlock',
    aliases: ['opengc'],
    description: 'Unlock group (everyone can send)',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const isAdm = meta.participants.find(p => p.id === sender)?.admin;
      if (!isAdm && !config.owner.includes(sender.split('@')[0])) return reply('❌ Admin only.');
      await sock.groupSettingUpdate(from, 'not_announcement');
      reply('🔓 *Group UNLOCKED* — everyone can send messages.');
    }
  },
  {
    command: 'approve',
    aliases: ['accept'],
    description: 'Approve pending join requests',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const isAdm = meta.participants.find(p => p.id === sender)?.admin;
      if (!isAdm && !config.owner.includes(sender.split('@')[0])) return reply('❌ Admin only.');

      const requests = meta.participants.filter(p => p.pending);
      if (!requests.length) return reply('✅ No pending requests.');
      for (const r of requests) {
        await sock.groupRequestParticipantsUpdate(from, [r.id], 'approve');
      }
      reply(`✅ Approved *${requests.length}* pending members.`);
    }
  }
];