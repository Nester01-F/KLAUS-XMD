const os = require('os');
const { getDB } = require('../lib/database');
const { runtime } = require('../lib/helper');

module.exports = [
  {
    command: 'stats',
    description: 'Bot statistics',
    category: 'owner',
    async run({ reply, config }) {
      const db = getDB();
      const up = runtime((Date.now() - db.stats.startedAt) / 1000);
      const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
      reply(
`📊 *${config.botName} STATS*
━━━━━━━━━━━━━━━━
⏱️ Uptime     : *${up}*
🧠 Commands   : *${db.stats.commands}*
👥 Users      : *${Object.keys(db.users).length}*
📁 Groups     : *${Object.keys(db.groups).length}*
💾 Memory     : *${mem} MB*
🖥️ Platform   : *${os.platform()} ${os.arch()}*
⚙️ Node       : *${process.version}*`
      );
    }
  },
  {
    command: 'groups',
    description: 'List all groups',
    category: 'owner',
    owner: true,
    async run({ sock, reply, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      const groups = await sock.groupFetchAllParticipating();
      const list = Object.values(groups)
        .slice(0, 20)
        .map((g, i) => `${i + 1}. ${g.subject} _(${g.participants.length}p)_`)
        .join('\n');
      reply(`📁 *GROUPS (${Object.keys(groups).length})*\n\n${list}`);
    }
  }
];