const { getBot, setBot } = require('../lib/database');
const { startAutoBio, stopAutoBio } = require('../lib/automation');

const DEFAULT_EMOJI = '❤️';
const DEFAULT_POOL = ['❤️', '🔥', '💯', '😍', '👏'];

const TOGGLES = {
  autorejectcall: { label: '📞 Auto-Reject Calls', aliases: ['autoreject', 'rejectcall'] },
  autoview:       { label: '👁️ AutoView Status', aliases: ['autoviewstatus'] },
  autoreact:      { label: '❤️ AutoReact Commands', aliases: [] },
  autoread:       { label: '📖 AutoRead Messages', aliases: [] },
  autotyping:     { label: '⌨️ AutoTyping', aliases: [] },
  autobio:        { label: '🎵 AutoBio Rotator', aliases: [] },
  autoblock:      { label: '🛡️ AutoBlock Spammers', aliases: [] },
  statusreact:    { label: '😀 Status Reaction', aliases: ['autostatusreact', 'autostatus', 'reactstatus'] }
};

const parseMode = (v) => {
  v = (v || '').toLowerCase();
  if (['on', 'enable', 'true', '1', 'yes'].includes(v)) return true;
  if (['off', 'disable', 'false', '0', 'no'].includes(v)) return false;
  return null;
};

const getSafe = async () => {
  const b = (await getBot()) || {};
  return {
    ...b,
    statusEmoji: b.statusEmoji || DEFAULT_EMOJI,
    reactEmojis: Array.isArray(b.reactEmojis) && b.reactEmojis.length ? b.reactEmojis : DEFAULT_POOL
  };
};

const flag = (v) => (v ? 'ON ✅' : 'OFF ❌');

const builder = (key, { label, aliases }) => ({
  command: key,
  aliases,
  description: `Toggle ${label}`,
  category: 'automation',
  owner: true,
  async run({ sock, reply, args, isOwner }) {
    if (!isOwner) return reply('❌ Owner only.');

    const mode = parseMode(args?.[0]);
    if (mode === null) return reply(`⚙️ Usage: .${key} on | off`);

    try {
      await setBot({ [key]: mode });

      if (key === 'autobio') {
        if (mode) await startAutoBio(sock);
        else stopAutoBio();
      }

      reply(`${label} is now *${mode ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    } catch (e) {
      console.error(`[${key}]`, e);
      reply('❌ Failed to update setting.');
    }
  }
});

module.exports = [
  ...Object.entries(TOGGLES).map(([k, v]) => builder(k, v)),

  {
    command: 'statusemoji',
    description: 'Set status reaction emoji',
    category: 'automation',
    owner: true,
    async run({ reply, text, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      const b = await getSafe();
      if (!text?.trim()) {
        return reply(`😀 Current emoji: *${b.statusEmoji}*\nUsage: .statusemoji ❤️`);
      }
      const emoji = text.trim().split(/\s+/)[0]; // WhatsApp reactions take a single emoji
      await setBot({ statusEmoji: emoji });
      reply(`✅ Status emoji set to *${emoji}*`);
    }
  },
  {
    command: 'reactemojis',
    description: 'Set autoreact emoji pool',
    category: 'automation',
    owner: true,
    async run({ reply, text, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      const b = await getSafe();
      if (!text?.trim()) {
        return reply(`🎨 Current pool: *${b.reactEmojis.join(' ')}*\nUsage: .reactemojis ❤️ 🔥 💯`);
      }
      const emojis = text.split(/\s+/).filter(Boolean);
      await setBot({ reactEmojis: emojis });
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
      const started = await startAutoBio(sock);
      reply(started ? '✅ AutoBio restarted.' : '⚠️ AutoBio is OFF. Run *.autobio on* first.');
    }
  },
  {
    command: 'automation',
    aliases: ['autos'],
    description: 'View all automation settings',
    category: 'automation',
    async run({ reply }) {
      const b = await getSafe();
      reply(
`🤖 *AUTOMATION SETTINGS*
━━━━━━━━━━━━━━━━
📞 AutoRejectCall : *${flag(b.autorejectcall)}*
👁️ AutoView       : *${flag(b.autoview)}*
❤️ AutoReact      : *${flag(b.autoreact)}*
📖 AutoRead       : *${flag(b.autoread)}*
⌨️ AutoTyping     : *${flag(b.autotyping)}*
🎵 AutoBio        : *${flag(b.autobio)}*
🛡️ AutoBlock      : *${flag(b.autoblock)}*
😀 StatusReact    : *${flag(b.statusreact)}*
😀 StatusEmoji    : *${b.statusEmoji}*
🎨 React pool     : *${b.reactEmojis.join(' ')}*

💡 Toggle with: *.autoview on/off* etc.`
      );
    }
  }
];