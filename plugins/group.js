function normalizeNumber(raw) {
  return String(raw || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

async function isAdmin(sock, groupId, jid, config) {
  // Owner bypass
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

async function isBotAdmin(sock, groupId) {
  try {
    const meta = await sock.groupMetadata(groupId);
    const botId = normalizeNumber(sock.user.id) + '@s.whatsapp.net';
    const me = meta.participants.find(p => normalizeNumber(p.id) === normalizeNumber(sock.user.id));
    return !!me?.admin;
  } catch { return false; }
}

function targetFrom(msg) {
  return msg.message.extendedTextMessage?.contextInfo?.participant || null;
}

module.exports = [
  /* ═══════════════════════════════════════════════════════════
     KICK
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'kick',
    aliases: ['remove'],
    description: 'Kick a member from the group',
    category: 'group',
    admin: true,
    async run({ sock, from, msg, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');
      if (!(await isBotAdmin(sock, from))) return reply('❌ I need to be admin to kick.');

      const target = targetFrom(msg);
      if (!target) return reply('👤 Reply to the person you want to kick.');
      if (normalizeNumber(target) === normalizeNumber(sender)) return reply('❌ You can\'t kick yourself.');
      if (normalizeNumber(target) === normalizeNumber(sock.user.id)) return reply('❌ I can\'t kick myself.');

      try {
        await sock.groupParticipantsUpdate(from, [target], 'remove');
        reply(`✅ Kicked @${target.split('@')[0]}`, { mentions: [target] });
      } catch (e) {
        reply(`❌ Kick failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     PROMOTE
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'promote',
    aliases: ['admin'],
    description: 'Promote a member to admin',
    category: 'group',
    admin: true,
    async run({ sock, from, msg, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');
      if (!(await isBotAdmin(sock, from))) return reply('❌ I need to be admin to promote.');

      const target = targetFrom(msg);
      if (!target) return reply('👤 Reply to the person you want to promote.');
      if (normalizeNumber(target) === normalizeNumber(sock.user.id)) return reply('❌ I\'m already admin.');

      try {
        await sock.groupParticipantsUpdate(from, [target], 'promote');
        reply(`✅ Promoted @${target.split('@')[0]} to admin`, { mentions: [target] });
      } catch (e) {
        reply(`❌ Promote failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     TAGALL
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'tagall',
    aliases: ['everyone', 'all'],
    description: 'Tag everyone in the group',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, text, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      try {
        const meta = await sock.groupMetadata(from);
        const mentions = meta.participants.map(p => p.id);

        const header = text ? `📢 *${text}*` : '📢 *ATTENTION EVERYONE*';
        const list = mentions.map(j => `@${j.split('@')[0]}`).join(' ');

        await sock.sendMessage(from, {
          text: `${header}\n\n${list}\n\n_— ${config.botName || 'Bot'}_`,
          mentions
        });
      } catch (e) {
        reply(`❌ Tag failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     DEMOTE
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'demote',
    aliases: ['unadmin'],
    description: 'Demote an admin to member',
    category: 'group',
    admin: true,
    async run({ sock, from, msg, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');
      if (!(await isBotAdmin(sock, from))) return reply('❌ I need to be admin to demote.');

      const target = targetFrom(msg);
      if (!target) return reply('👤 Reply to the admin you want to demote.');
      if (normalizeNumber(target) === normalizeNumber(sock.user.id)) return reply('❌ I can\'t demote myself.');

      try {
        await sock.groupParticipantsUpdate(from, [target], 'demote');
        reply(`⬇️ Demoted @${target.split('@')[0]} to member`, { mentions: [target] });
      } catch (e) {
        reply(`❌ Demote failed: ${e.message}`);
      }
    }
  }
];