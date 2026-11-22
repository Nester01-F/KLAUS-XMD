cat > plugins/leaderboard.js << 'EOF'
const { getGameTop, getCommandTop } = require('../lib/database');

const GAMES = ['ttt', 'hangman', 'wordle'];

module.exports = [
  {
    command: 'top',
    aliases: ['leaderboard', 'lb'],
    description: 'Show leaderboard',
    category: 'leaderboard',
    async run({ reply, args }) {
      const type = args[0]?.toLowerCase() || 'commands';

      if (type === 'commands' || type === 'cmd') {
        const top = getCommandTop(10);
        if (!top.length) return reply('📊 No command usage data yet.');
        const list = top.map(([jid, count], i) => {
          const medals = ['🥇','🥈','🥉'];
          return `${medals[i] || `${i+1}.`} @${jid.split('@')[0]} — *${count}* commands`;
        }).join('\n');
        return reply(`🏆 *TOP COMMAND USERS*\n━━━━━━━━━━━━━━━\n${list}`);
      }

      if (GAMES.includes(type)) {
        const top = getGameTop(type, 10);
        if (!top.length) return reply(`📊 No ${type} wins recorded yet.`);
        const list = top.map(([jid, count], i) => {
          const medals = ['🥇','🥈','🥉'];
          return `${medals[i] || `${i+1}.`} @${jid.split('@')[0]} — *${count}* wins`;
        }).join('\n');
        return reply(`🏆 *${type.toUpperCase()} LEADERBOARD*\n━━━━━━━━━━━━━━━\n${list}`);
      }

      reply(`🏆 *LEADERBOARD*\n\nUsage: .top commands | ttt | hangman | wordle`);
    }
  },
  {
    command: 'mystats',
    aliases: ['myrank'],
    description: 'Your personal stats',
    category: 'leaderboard',
    async run({ reply, sender }) {
      const { getLeaderboard } = require('../lib/database');
      const lb = getLeaderboard();
      const cmdCount = lb.commands[sender] || 0;
      const wins = {};
      GAMES.forEach(g => {
        const w = lb.games[g]?.[sender];
        if (w) wins[g] = w;
      });
      const winsTxt = Object.keys(wins).length
        ? Object.entries(wins).map(([g, w]) => `  🎮 ${g}: *${w}*`).join('\n')
        : '  _no wins yet_';
      reply(
`📊 *YOUR STATS*
━━━━━━━━━━━━━━━
⚡ Commands used: *${cmdCount}*
🏆 Game wins:
${winsTxt}`
      );
    }
  }
];
EOF
