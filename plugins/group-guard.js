const { getGroup, setGroup, resetWarnings, getWarnings } = require('../lib/database');

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
     ANTILINK — toggle + action
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'antilink',
    description: 'Enable/disable antilink',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      const mode = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(mode)) {
        const g = getGroup(from);
        return reply(
`🛡️ *ANTILINK SETTINGS*
━━━━━━━━━━━━━━━
🔗 Status  : *${g.antilink ? 'ON ✅' : 'OFF ❌'}*
⚡ Action  : *${g.antilinkAction || 'warn'}*

*Usage:*
• \`.antilink on\` — enable
• \`.antilink off\` — disable
• \`.antilinkaction warn\` — warn then kick (3 strikes)
• \`.antilinkaction kick\` — instant kick`
        );
      }

      setGroup(from, { antilink: mode === 'on' });
      reply(`🛡️ *Antilink ${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  },

  /* ═══════════════════════════════════════════════════════════
     ANTILINK ACTION — warn or kick
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'antilinkaction',
    aliases: ['antilinkmode', 'alam'],
    description: 'Set antilink action: warn or kick',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      const action = args[0]?.toLowerCase();
      if (!['warn', 'kick'].includes(action)) {
        const g = getGroup(from);
        return reply(
`⚡ *ANTILINK ACTION*
━━━━━━━━━━━━━━━
Current: *${g.antilinkAction || 'warn'}*

*Options:*
• \`.antilinkaction warn\` — send 3 warnings, then kick
• \`.antilinkaction kick\` — remove immediately

_⚠️ Requires antilink to be ON_`
        );
      }

      setGroup(from, { antilinkAction: action });
      reply(
        `✅ *Antilink action set to* \`${action}\`\n\n` +
        (action === 'warn'
          ? '_Users will get 3 warnings before removal_'
          : '_Users will be removed immediately on link detection_')
      );
    }
  },

  /* ═══════════════════════════════════════════════════════════
     ANTISPAM — with action
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'antispam',
    description: 'Enable/disable antispam',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      const mode = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(mode)) {
        const g = getGroup(from);
        return reply(
`🚫 *ANTISPAM SETTINGS*
━━━━━━━━━━━━━━━
🚫 Status  : *${g.antispam ? 'ON ✅' : 'OFF ❌'}*
⚡ Action  : *${g.antispamAction || 'warn'}*

*Usage:*
• \`.antispam on\` / \`.antispam off\`
• \`.antispamaction warn\` — 3 warnings then kick
• \`.antispamaction kick\` — instant kick`
        );
      }

      setGroup(from, { antispam: mode === 'on' });
      reply(`🚫 *Antispam ${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  },

  /* ═══════════════════════════════════════════════════════════
     ANTISPAM ACTION
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'antispamaction',
    aliases: ['antispammode', 'asam'],
    description: 'Set antispam action: warn or kick',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      const action = args[0]?.toLowerCase();
      if (!['warn', 'kick'].includes(action)) {
        const g = getGroup(from);
        return reply(
`⚡ *ANTISPAM ACTION*
━━━━━━━━━━━━━━━
Current: *${g.antispamAction || 'warn'}*

*Options:*
• \`.antispamaction warn\` — warnings then kick
• \`.antispamaction kick\` — instant kick`
        );
      }

      setGroup(from, { antispamAction: action });
      reply(`✅ *Antispam action set to* \`${action}\``);
    }
  },

  /* ═══════════════════════════════════════════════════════════
     WARNINGS
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'warnings',
    aliases: ['warns'],
    description: 'Check member warnings',
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

  /* ═══════════════════════════════════════════════════════════
     RESETWARN
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'resetwarn',
    aliases: ['clearwarn'],
    description: 'Reset member warnings',
    category: 'group',
    admin: true,
    async run({ sock, msg, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      const target = msg.message.extendedTextMessage?.contextInfo?.participant ||
        (msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [])[0];

      if (!target) return reply('👤 Reply to or mention someone.');

      resetWarnings(from, target);
      reply(`✅ Warnings cleared for @${target.split('@')[0]}`, { mentions: [target] });
    }
  },

  /* ═══════════════════════════════════════════════════════════
     GUARDSTATUS
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'guardstatus',
    aliases: ['guard'],
    description: 'Show guard status',
    category: 'group',
    async run({ from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');

      const g = getGroup(from);
      reply(
`╔══════════════════════════════════════╗
║      🛡️ *GUARD STATUS*               ║
╚══════════════════════════════════════╝

┏━━━━━「 PROTECTION 」━━━━━┓
┃ 🔗 Antilink  : *${g.antilink ? 'ON ✅' : 'OFF ❌'}*
┃ ⚡ Action    : *${g.antilinkAction || 'warn'}*
┃ 🚫 Antispam  : *${g.antispam ? 'ON ✅' : 'OFF ❌'}*
┃ ⚡ Action    : *${g.antispamAction || 'warn'}*
┃ 🤖 Antibot   : *${g.antibot ? 'ON ✅' : 'OFF ❌'}*
┃ 🗑️ Antidelete: *${g.antidelete ? 'ON ✅' : 'OFF ❌'}*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━「 WELCOME 」━━━━━┓
┃ 👋 Welcome  : *${g.welcome ? 'ON ✅' : 'OFF ❌'}*
┃ 👋 Goodbye  : *${g.goodbye ? 'ON ✅' : 'OFF ❌'}*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━「 WARNINGS 」━━━━━┓
┃ ⚠️ Users    : *${Object.keys(g.warnings || {}).length}*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛`
      );
    }
  },

  /* ═══════════════════════════════════════════════════════════
     WELCOME
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'welcome',
    description: 'Toggle welcome messages',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      const mode = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(mode)) return reply('👋 Usage: .welcome on | off');

      setGroup(from, { welcome: mode === 'on' });
      reply(`👋 *Welcome messages ${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  },

  /* ═══════════════════════════════════════════════════════════
     GOODBYE
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'goodbye',
    description: 'Toggle goodbye messages',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      const mode = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(mode)) return reply('👋 Usage: .goodbye on | off');

      setGroup(from, { goodbye: mode === 'on' });
      reply(`👋 *Goodbye messages ${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  },

  /* ═══════════════════════════════════════════════════════════
     ANTIBOT
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'antibot',
    description: 'Toggle antibot protection',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      const mode = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(mode)) return reply('🤖 Usage: .antibot on | off');

      setGroup(from, { antibot: mode === 'on' });
      reply(`🤖 *Antibot ${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  },

  /* ═══════════════════════════════════════════════════════════
     ANTIDELETE
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'antidelete',
    description: 'Toggle antidelete protection',
    category: 'group',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      const mode = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(mode)) return reply('🗑️ Usage: .antidelete on | off');

      setGroup(from, { antidelete: mode === 'on' });
      reply(`🗑️ *Antidelete ${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  }
];