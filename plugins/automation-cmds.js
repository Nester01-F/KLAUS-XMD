cat > plugins/automation-cmds.js << 'EOF'
const { getBot, setBot } = require('../lib/database');
const { startAutoBio, stopAutoBio } = require('../lib/automation');

const TOGGLES = {
  autoview: '👁️ AutoView Status',
  autoreact: '❤️ AutoReact Commands',
  autoread: '📖 AutoRead Messages',
  autotyping: '⌨️ AutoTyping',
  autobio: '🎵 AutoBio Rotator',
  autoblock: '🛡️ AutoBlock Spammers',
  statusreact: '😀 Status Reaction'
};

const builder = (key, label) => ({
  command: key,
  description: `Toggle ${label}`,
  category: 'automation',
  async run({ reply, args }) {
    const mode = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(mode)) return reply(`⚙️ Usage: .${key} on | off`);
    setBot({ [key]: mode === 'on' });
    reply(`${label} is now *${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
  }
});

module.exports = [
  ...Object.entries(TOGGLES).map(([k, v]) => builder(k, v)),

  {
    command: 'statusemoji',
    description: 'Set status reaction emoji',
    category: 'automation',
    async run({ reply, text }) {
      if (!text) return reply(`😀 Current emoji: *${getBot().statusEmoji}*\nUsage: .statusemoji ❤️`);
      setBot({ statusEmoji: text.trim() });
      reply(`✅ Status emoji set to *${text.trim()}*`);
    }
  },
  {
    command: 'reactemojis',
    description: 'Set autoreact emoji pool',
    category: 'automation',
    async run({ reply, text }) {
      if (!text) return reply(`🎨 Current pool: *${getBot().reactEmojis.join(' ')}*\nUsage: .reactemojis ❤️ 🔥 💯`);
      const emojis = text.split(/\s+/).filter(Boolean);
      setBot({ reactEmojis: emojis });
      reply(`✅ React emoji pool set to: ${emojis.join(' ')}`);
    }
  },
  {
    command: 'restartbio',
    description: 'Restart AutoBio cycle',
    category: 'automation',
    owner: true,
    async run({ sock, reply, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      stopAutoBio();
      startAutoBio(sock);
      reply('✅ AutoBio restarted.');
    }
  },
  {
    command: 'automation',
    aliases: ['autos'],
    description: 'View all automation settings',
    category: 'automation',
    async run({ reply }) {
      const b = getBot();
      reply(
`🤖 *AUTOMATION SETTINGS*
━━━━━━━━━━━━━━━━
👁️ AutoView     : *${b.autoview ? 'ON ✅' : 'OFF ❌'}*
❤️ AutoReact    : *${b.autoreact ? 'ON ✅' : 'OFF ❌'}*
📖 AutoRead     : *${b.autoread ? 'ON ✅' : 'OFF ❌'}*
⌨️ AutoTyping   : *${b.autotyping ? 'ON ✅' : 'OFF ❌'}*
🎵 AutoBio      : *${b.autobio ? 'ON ✅' : 'OFF ❌'}*
🛡️ AutoBlock    : *${b.autoblock ? 'ON ✅' : 'OFF ❌'}*
😀 StatusReact  : *${b.statusreact ? 'ON ✅' : 'OFF ❌'}*
😀 StatusEmoji  : *${b.statusEmoji}*
🎨 React pool   : *${b.reactEmojis.join(' ')}*

💡 Toggle with: *.autoview on/off* etc.`
      );
    }
  }
];
