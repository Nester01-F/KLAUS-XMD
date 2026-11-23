

const sleep = ms => new Promise(r => setTimeout(r, ms));
const MAX_BROADCAST_CHARS = 2000;

module.exports = [
  {
    command: 'dev',
    aliases: ['owner'],
    description: 'Show developer',
    category: 'owner',
    async run({ sock, from, msg, reply, config }) {
      const ownerName = config.ownerName || 'Warrior Felix';
      const ownerNumber = String(config.owner?.[0] || '254701881604').replace(/\D/g, '');
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';

      const caption =
        BANNER + '\n\n' +
        panel('👑 DEVELOPER', [
          ['👤 Name', `*${ownerName}*`],
          ['📱 Contact', `+${ownerNumber}`],
          ['💬 Chat', `https://wa.me/${ownerNumber}`],
          ['🌍 Region', '🇰🇪 Kenya'],
          ['🏢 Team', '*KLAUS TECH*'],
          '🔗 *GitHub*',
          repo
        ]) + '\n\n' +
        panel('🤖 BOT', [
          ['🧠 Bot', `*${config.botName}*`],
          ['⚙️ Engine', '*Baileys*'],
          ['🌐 Status', '*Active*']
        ]) + '\n\n' +
        `_Built with ❤️ by ${ownerName}_`;

      try {
        if (caption.length <= 1000) {
          await sock.sendMessage(from, { image: { url: config.images.dev }, caption }, { quoted: msg });
        } else {
          // Long cards go as image + separate text so WhatsApp never cuts them off
          await sock.sendMessage(from, { image: { url: config.images.dev } }, { quoted: msg });
          await reply(caption);
        }
      } catch {
        await reply(caption);
      }
    }
  },

  {
    command: 'broadcast',
    aliases: ['bc'],
    description: 'Broadcast a message to all groups',
    category: 'owner',
    async run({ sock, text, reply, isOwner, config }) {
      if (!isOwner) return reply('❌ *Owner only command!*');
      if (!text) return reply(`📢 Example: ${config.prefix}bc Hello everyone`);
      if (text.length > MAX_BROADCAST_CHARS) {
        return reply(`❌ That message is too long (${text.length} characters). Keep it under ${MAX_BROADCAST_CHARS}.`);
      }

      let groups;
      try {
        groups = Object.keys(await sock.groupFetchAllParticipating());
      } catch {
        return reply('💥 Could not load the group list. Try again in a moment.');
      }
      if (!groups.length) return reply('ℹ️ The bot is not in any groups.');

      await reply(`📢 Broadcasting to *${groups.length}* groups...\n_One message every 2-4 seconds so WhatsApp does not flag the account._`);

      let sent = 0;
      let failed = 0;
      for (const id of groups) {
        try {
          await sock.sendMessage(id, { text: `📢 *BROADCAST*\n\n${text}\n\n_— ${config.botName}_` });
          sent++;
        } catch {
          failed++;
        }
        await sleep(2000 + Math.floor(Math.random() * 2000)); // pause between groups: sending in a burst risks a ban
      }

      await reply(panel('📢 BROADCAST DONE', [
        ['✅ Sent', `*${sent}*`],
        ['❌ Failed', `*${failed}*`],
        ['👥 Groups', `*${groups.length}*`]
      ]));
    }
  },

  {
    command: 'restart',
    description: 'Restart the bot',
    category: 'owner',
    async run({ reply, isOwner }) {
      if (!isOwner) return reply('❌ *Owner only command!*');
      await reply('♻️ Restarting... back in a few seconds.');
      await sleep(1500); // let the message go out before the process ends
      process.exit(1); // non-zero so crash-based auto-restart (panels) brings it back too
    }
  }
];