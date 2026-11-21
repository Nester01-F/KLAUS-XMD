const config = require('../config');

module.exports = [
  {
    command: 'setpp',
    description: 'Set bot profile picture',
    category: 'owner',
    owner: true,
    async run({ sock, msg, reply, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted?.imageMessage) return reply('🖼️ Reply to an image.');
      const buf = await sock.downloadMediaMessage({ message: quoted }, 'buffer', {}, {});
      await sock.updateProfilePicture(sock.user.id, buf);
      reply('✅ Profile picture updated.');
    }
  },
  {
    command: 'setname',
    description: 'Set bot display name',
    category: 'owner',
    owner: true,
    async run({ sock, reply, text, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      if (!text) return reply('📛 Example: .setname KLAUS XMD v2');
      await sock.updateProfileName(text);
      reply('✅ Name updated.');
    }
  },
  {
    command: 'setbio',
    description: 'Set bot bio',
    category: 'owner',
    owner: true,
    async run({ sock, reply, text, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      await sock.updateProfileStatus(text || '⚡ KLAUS XMD — Powered by KLAUS TECH');
      reply('✅ Bio updated.');
    }
  },
  {
    command: 'eval',
    description: 'Execute JS (owner only)',
    category: 'owner',
    owner: true,
    async run({ reply, text, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      try {
        let result = await eval(`(async() => { ${text} })()`);
        reply(`✅ *Result:*\n\`\`\`${require('util').inspect(result)}\`\`\``);
      } catch (e) { reply(`❌ *Error:*\n${e.message}`); }
    }
  }
];