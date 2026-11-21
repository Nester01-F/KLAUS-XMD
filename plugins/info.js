const { getDB, getUser } = require('../lib/database');
const moment = require('moment-timezone');

module.exports = [
  {
    command: 'info',
    aliases: ['botinfo'],
    description: 'Bot information',
    category: 'info',
    async run({ sock, reply, config, plugins }) {
      const db = getDB();
      const start = db.stats.startedAt;
      const upSec = (Date.now() - start) / 1000;
      const d = Math.floor(upSec / 86400), h = Math.floor((upSec % 86400) / 3600), m = Math.floor((upSec % 3600) / 60);

      reply(
`🤖 *${config.botName} INFO*
━━━━━━━━━━━━━━━━
📦 Commands   : *${plugins.size}*
⏱️ Uptime     : *${d}d ${h}h ${m}m*
👥 Total Users: *${Object.keys(db.users).length}*
📁 Groups     : *${Object.keys(db.groups).length}*
⚙️ Prefix     : *${config.prefix}*
🖥️ Platform   : *${process.platform}*
⚡ Node       : *${process.version}*

> _${config.botName} © 2026_`
      );
    }
  },
  {
    command: 'profile',
    aliases: ['me'],
    description: 'Your profile',
    category: 'info',
    async run({ reply, sender }) {
      const u = getUser(sender);
      reply(
`👤 *YOUR PROFILE*
━━━━━━━━━━━━━━━
📛 JID      : *${sender.split('@')[0]}*
🏷️ Name     : *${u.name || 'not set'}*
⚠️ Warnings : *${u.warnings || 0}*
📅 Joined   : *${moment(u.createdAt).format('MMM Do YYYY')}*

💡 Set name with *.set name YourName*`
      );
    }
  },
  {
    command: 'groupinfo',
    aliases: ['gcinfo'],
    description: 'Group information',
    category: 'info',
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const meta = await sock.groupMetadata(from);
      const admins = meta.participants.filter(p => p.admin).length;
      reply(
`📁 *GROUP INFO*
━━━━━━━━━━━━━━━
📛 Name     : *${meta.subject}*
👥 Members  : *${meta.participants.length}*
👑 Admins   : *${admins}*
📅 Created  : *${moment(meta.creation * 1000).format('MMM Do YYYY')}*
📝 Desc     : ${meta.desc?.slice(0, 100) || 'none'}`
      );
    }
  },
  {
    command: 'whois',
    aliases: ['profile2'],
    description: 'Look up a user',
    category: 'info',
    async run({ sock, msg, reply }) {
      const target = msg.message.extendedTextMessage?.contextInfo?.participant ||
        (msg.message.extendedTextMessage?.contextInfo?.mentionedJid || [])[0];
      if (!target) return reply('👤 Reply to or mention someone.');
      const u = getUser(target);
      reply(
`🔍 *WHO IS @${target.split('@')[0]}?*
━━━━━━━━━━━━━━━
🏷️ Name     : *${u.name || 'unknown'}*
⚠️ Warnings : *${u.warnings || 0}*
📅 First seen: *${moment(u.createdAt).format('MMM Do YYYY')}*`,
        { mentions: [target] }
      );
    }
  }
];
