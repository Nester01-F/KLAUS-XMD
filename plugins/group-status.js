const { getGroup, setGroup } = require('../lib/database');

/* ── Inline admin check with owner bypass ───────────────────── */
function normalizeNumber(raw) {
  return String(raw || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

async function isAdmin(sock, groupId, jid, config) {
  if (config) {
    const num = normalizeNumber(jid);
    const owners = (config.owner || []).map(normalizeNumber);
    if (owners.includes(num)) return true;
  }
  try {
    const meta = await sock.groupMetadata(groupId);
    const p = meta.participants.find(x => x.id === jid);
    return !!p?.admin;
  } catch { return false; }
}

module.exports = [
  /* ═══════════════════════════════════════════════════════════
     GROUP STATUS — full info
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'groupstatus',
    aliases: ['gstatus', 'groupstats'],
    description: 'Show full group status',
    category: 'group',
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');

      try {
        const meta = await sock.groupMetadata(from);
        const g = getGroup(from);
        const admins = meta.participants.filter(p => p.admin).length;
        const members = meta.participants.length - admins;
        const created = new Date(meta.creation * 1000).toLocaleDateString();

        reply(
`╔══════════════════════════════════════╗
║      📊 *GROUP STATUS*               ║
╚══════════════════════════════════════╝

┏━━━━━「 GROUP INFO 」━━━━━┓
┃ 📛 Name    : *${meta.subject}*
┃ 👥 Members : *${meta.participants.length}*
┃ 👑 Admins  : *${admins}*
┃ 👤 Regular : *${members}*
┃ 📅 Created : *${created}*
┃ 🔒 Locked  : *${meta.announce ? 'YES ✅' : 'NO ❌'}*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━「 🛡️ GUARD 」━━━━━┓
┃ 🔗 Antilink  : *${g.antilink ? 'ON ✅' : 'OFF ❌'}* (${g.antilinkAction || 'warn'})
┃ 🚫 Antispam  : *${g.antispam ? 'ON ✅' : 'OFF ❌'}* (${g.antispamAction || 'warn'})
┃ 🤖 Antibot   : *${g.antibot ? 'ON ✅' : 'OFF ❌'}*
┃ 🗑️ Antidelete: *${g.antidelete ? 'ON ✅' : 'OFF ❌'}*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━「 👋 GREETINGS 」━━━━━┓
┃ 👋 Welcome  : *${g.welcome ? 'ON ✅' : 'OFF ❌'}*
┃ 👋 Goodbye  : *${g.goodbye ? 'ON ✅' : 'OFF ❌'}*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━「 ⚠️ WARNINGS 」━━━━━┓
┃ ⚠️ Users   : *${Object.keys(g.warnings || {}).length}*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
        );
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     ADMINS LIST
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'admins',
    aliases: ['listadmins'],
    description: 'List group admins',
    category: 'group',
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');

      try {
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
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     MEMBERS LIST
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'members',
    aliases: ['listmembers'],
    description: 'List group members',
    category: 'group',
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');

      try {
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
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     GROUP DESCRIPTION
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'groupdesc',
    aliases: ['gdesc'],
    description: 'Show group description',
    category: 'group',
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');

      try {
        const meta = await sock.groupMetadata(from);
        reply(`📝 *GROUP DESCRIPTION*\n━━━━━━━━━━━━━━━\n${meta.desc || '_No description set._'}`);
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     SET DESCRIPTION
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'setdesc',
    description: 'Set group description',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, text, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');
      if (!text) return reply('📝 Example: .setdesc Welcome to our group!');

      try {
        await sock.groupUpdateDescription(from, text);
        reply('✅ Group description updated.');
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     SET SUBJECT
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'setsubject',
    aliases: ['setname2', 'gname'],
    description: 'Set group subject/name',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, text, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');
      if (!text) return reply('📛 Example: .setsubject My Group Name');

      try {
        await sock.groupUpdateSubject(from, text);
        reply(`✅ Group name updated to *${text}*`);
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     RESET LINK
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'resetlink',
    aliases: ['revoke'],
    description: 'Reset group invite link',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      try {
        await sock.groupRevokeInvite(from);
        const code = await sock.groupInviteCode(from);
        reply(`🔄 *Link reset!*\n\n🔗 https://chat.whatsapp.com/${code}`);
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     LOCK GROUP
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'lock',
    aliases: ['closegc'],
    description: 'Lock group (admins only can send)',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      try {
        await sock.groupSettingUpdate(from, 'announcement');
        reply('🔒 *Group LOCKED* — only admins can send messages.');
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     UNLOCK GROUP
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'unlock',
    aliases: ['opengc'],
    description: 'Unlock group (everyone can send)',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      try {
        await sock.groupSettingUpdate(from, 'not_announcement');
        reply('🔓 *Group UNLOCKED* — everyone can send messages.');
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     APPROVE JOIN REQUESTS
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'approve',
    aliases: ['accept'],
    description: 'Approve pending join requests',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      try {
        const meta = await sock.groupMetadata(from);
        const requests = meta.participants.filter(p => p.pending);
        if (!requests.length) return reply('✅ No pending requests.');

        for (const r of requests) {
          await sock.groupRequestParticipantsUpdate(from, [r.id], 'approve');
        }
        reply(`✅ Approved *${requests.length}* pending members.`);
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     MUTE (same as lock)
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'mute',
    description: 'Mute group',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      try {
        await sock.groupSettingUpdate(from, 'announcement');
        reply('🔇 *Group muted* — only admins can send.');
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     UNMUTE (same as unlock)
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'unmute',
    description: 'Unmute group',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      try {
        await sock.groupSettingUpdate(from, 'not_announcement');
        reply('🔊 *Group unmuted* — everyone can send.');
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     GROUP INVITE LINK
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'linkgc',
    aliases: ['ginvite'],
    description: 'Get group invite link',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      try {
        const code = await sock.groupInviteCode(from);
        reply(`🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${code}`);
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  }
];