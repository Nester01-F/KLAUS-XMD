module.exports = [
  {
    command: 'dev',
    aliases: ['owner'],
    description: 'Show developer',
    category: 'owner',
    async run({ sock, from, config }) {
      await sock.sendMessage(from, {
        image: { url: config.images.dev },
        caption:
`╭━〔 *DEVELOPER* 〕━⬣
┃ 👤 Name   : *Warrior Felix*
┃ 🧠 Bot    : *${config.botName}*
┃ ⚙️ Engine : *Baileys*
┃ 🌐 Status : *Active*
╰━━━━━━━━━━━━━━━━⬣
> _Built with ❤️ by Warrior Felix_`
      });
    }
  },
  {
    command: 'broadcast',
    aliases: ['bc'],
    description: 'Broadcast to all groups',
    category: 'owner',
    owner: true,
    async run({ sock, text, reply, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      if (!text) return reply('📢 Example: .bc Hello everyone');
      const groups = await sock.groupFetchAllParticipating();
      let count = 0;
      for (const id in groups) {
        try {
          await sock.sendMessage(id, { text: `📢 *BROADCAST*\n\n${text}` });
          count++;
        } catch {}
      }
      reply(`✅ Sent to ${count} groups.`);
    }
  },
  {
    command: 'restart',
    description: 'Restart bot',
    category: 'owner',
    owner: true,
    async run({ reply, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      await reply('♻️ Restarting...');
      process.exit(0);
    }
  }
];