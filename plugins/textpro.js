const axios = require('axios');

const API = 'https://apix.wolvarex.com';
const KEY = process.env.WOLVAREX_KEY || 'wxa_f_2fca8d14eb';
const api = (path) => `${API}${path}${path.includes('?') ? '&' : '?'}key=${KEY}`;

// All 109 effects from the API
const EFFECTS = [
  'alien-glow','neon-blue','neon-pink','neon-purple','neon-red','neon-gold',
  'neon-cyan','neon-orange','neon-white','3d-outline','3d-blue','3d-red',
  '3d-green','3d-purple','chrome','gold-chrome','blue-chrome','copper-chrome',
  'epic-3d','simple-3d','fire','inferno','lava','ice-fire','embossed',
  'gold-embossed','classic-gold','retro','groovy','groovy-blue','steel',
  'dark-steel','comic-pop','comic-red','graffiti','graffiti-green','old-stone',
  'stone-blue','carved','glitter-gold','glitter-silver','glitter-pink',
  'glitter-blue','glitter-green','glitter-purple','glitter-red','glitter-cyan',
  'glitter-orange','glitter-bronze','gradient','gradient-blue','gradient-green',
  'curvy','curvy-orange','basic-bold','basic-red','scratch','scratch-silver',
  'elegant','elegant-silver','tribal','tribal-red','sketch','sketch-blue',
  'racing','racing-blue','medieval','medieval-gold','chalk','chalk-pink',
  'sparkle','sparkle-blue','sparkle-pink','sharp','sharp-blue','fantasy',
  'fantasy-gold','watercolor','watercolor-green','blocky','blocky-blue','glass',
  'glass-green','stencil','stencil-red','matrix','matrix-blue','nifty',
  'nifty-purple','futuristic','futuristic-red','vintage','vintage-gold','candy',
  'candy-blue','pastel','pastel-mint','metallic','metallic-gold','pixel',
  'pixel-green','western','western-gold','horror','horror-green','sci-fi',
  'sci-fi-red','frost','frost-blue'
];

const PAGE_SIZE = 30;

module.exports = [
  {
    command: 'textpro',
    aliases: ['tp', 'textpro2'],
    description: 'TextPro - 109 text effects',
    category: 'text',
    async run({ sock, msg, from, reply, args }) {
      const effect = args[0]?.toLowerCase();
      const text = args.slice(1).join(' ').trim();
      const page = parseInt(args[0]) || 1;

      // No args → show effect list
      if (!effect) {
        return showList(sock, from, msg, reply, 1);
      }

      // If first arg is a number → pagination
      if (!isNaN(page) && !text) {
        return showList(sock, from, msg, reply, page);
      }

      // `list` keyword
      if (effect === 'list' || effect === 'help') {
        return showList(sock, from, msg, reply, 1);
      }

      // Validate effect
      if (!EFFECTS.includes(effect)) {
        const suggestions = EFFECTS.filter(e => e.includes(effect.split('-')[0])).slice(0, 5);
        return reply(
          `❌ *Unknown effect:* \`${effect}\`\n\n` +
          (suggestions.length ? `💡 Try: ${suggestions.join(', ')}\n\n` : '') +
          `📋 Use \`.textpro list\` to see all 109 effects`
        );
      }

      if (!text) {
        return reply(`✏️ Example: \`.textpro ${effect} Hello World\``);
      }

      if (text.length > 100) {
        return reply('❌ Text too long. Max 100 characters.');
      }

      await reply(`🎨 *Generating ${effect}...*`);

      try {
        const { data } = await axios.get(
          api(`/api/textpro/generate?effect=${encodeURIComponent(effect)}&text=${encodeURIComponent(text)}`),
          { timeout: 30000 }
        );

        const imageUrl = data?.imageUrl || data?.result?.url || data?.url;
        if (!imageUrl) throw new Error(data?.error || 'No image returned');

        await sock.sendMessage(from, {
          image: { url: imageUrl },
          caption: `🎨 *${effect}*\n\n✏️ ${text}\n\n> _KLAUS XMD TextPro_`
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Generation failed: ${e.message}`);
      }
    }
  },

  // Quick shortcuts for popular effects
  ...[
    { effect: 'neon-blue', cmd: 'neonblue' },
    { effect: 'neon-pink', cmd: 'neonpink' },
    { effect: 'neon-purple', cmd: 'neonpurple' },
    { effect: 'neon-red', cmd: 'neonred' },
    { effect: 'fire', cmd: 'firetext' },
    { effect: 'matrix', cmd: 'matrix' },
    { effect: 'horror', cmd: 'horror' },
    { effect: 'glitter-gold', cmd: 'glitter' },
    { effect: '3d-blue', cmd: '3d' },
    { effect: 'chrome', cmd: 'chrome' },
    { effect: 'vintage', cmd: 'vintage' },
    { effect: 'futuristic', cmd: 'futuristic' },
    { effect: 'frost', cmd: 'frost' },
    { effect: 'gradient', cmd: 'gradient' },
    { effect: 'comic-pop', cmd: 'comic' },
    { effect: 'graffiti', cmd: 'graffiti' },
    { effect: 'watercolor', cmd: 'watercolor' },
    { effect: 'glass', cmd: 'glass' },
    { effect: 'sci-fi', cmd: 'scifi' },
    { effect: 'alien-glow', cmd: 'alien' },
    { effect: 'matrix-blue', cmd: 'matrixblue' },
    { effect: 'glitter-pink', cmd: 'glitterpink' },
    { effect: 'glitter-red', cmd: 'glitterred' },
    { effect: '3d-red', cmd: '3dred' },
    { effect: '3d-green', cmd: '3dgreen' },
    { effect: 'gold-chrome', cmd: 'gold' },
    { effect: 'ice-fire', cmd: 'icefire' },
    { effect: 'lava', cmd: 'lava' },
    { effect: 'pixel', cmd: 'pixel' },
    { effect: 'elegant', cmd: 'elegant' }
  ].map(({ effect, cmd }) => ({
    command: cmd,
    description: `TextPro - ${effect} effect`,
    category: 'text',
    async run({ sock, msg, from, reply, text }) {
      if (!text) return reply(`✏️ Example: \`.${cmd} Hello World\``);
      if (text.length > 100) return reply('❌ Text too long. Max 100 characters.');

      await reply(`🎨 *Generating ${effect}...*`);
      try {
        const { data } = await axios.get(
          api(`/api/textpro/generate?effect=${encodeURIComponent(effect)}&text=${encodeURIComponent(text)}`),
          { timeout: 30000 }
        );
        const imageUrl = data?.imageUrl || data?.result?.url || data?.url;
        if (!imageUrl) throw new Error(data?.error || 'No image');

        await sock.sendMessage(from, {
          image: { url: imageUrl },
          caption: `🎨 *${effect}*\n\n✏️ ${text}`
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  }))
];

async function showList(sock, from, msg, reply, page = 1) {
  const totalPages = Math.ceil(EFFECTS.length / PAGE_SIZE);
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const start = (page - 1) * PAGE_SIZE;
  const slice = EFFECTS.slice(start, start + PAGE_SIZE);

  let txt = `🎨 *TEXTPRO EFFECTS* (${EFFECTS.length} total)\n`;
  txt += `━━━━━━━━━━━━━━━━━━\n`;
  txt += `📄 Page *${page}/${totalPages}*\n\n`;

  slice.forEach((e, i) => {
    txt += `*${start + i + 1}.* ${e}\n`;
  });

  txt += `\n━━━━━━━━━━━━━━━━━━\n`;
  txt += `💡 Usage: \`.textpro <effect> <text>\`\n`;
  txt += `📄 Next page: \`.textpro ${page + 1}\`\n`;
  txt += `⚡ Shortcuts: \`.neonblue\`, \`.firetext\`, \`.matrix\` etc.\n`;
  txt += `\n> _Powered by Wolvarex API_`;

  if (page < totalPages) {
    txt += `\n\n📌 *Next 30 effects:* \`.textpro ${page + 1}\``;
  }

  await sock.sendMessage(from, {
    text: txt,
    contextInfo: {
      externalAdReply: {
        title: 'TextPro — 109 Text Effects',
        body: `Page ${page}/${totalPages} · Powered by Wolvarex`,
        thumbnailUrl: 'https://files.catbox.moe/lusgnl.jpg',
        mediaType: 1
      }
    }
  }, { quoted: msg });
}