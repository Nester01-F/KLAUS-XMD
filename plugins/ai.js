const axios = require('axios');

module.exports = [
  {
    command: 'gpt',
    aliases: ['ai', 'chat'],
    description: 'Ask ChatGPT',
    category: 'ai',
    async run({ reply, text }) {
      if (!text) return reply('🤖 Example: .gpt what is love?');
      try {
        const { data } = await axios.get(
          `https://api.giftedtech.my.id/api/ai/gpt4?apikey=gifted&q=${encodeURIComponent(text)}`
        );
        reply(data.result || '🤷 No response.');
      } catch { reply('❌ AI unavailable.'); }
    }
  },
  {
    command: 'imagine',
    aliases: ['img'],
    description: 'AI image generation',
    category: 'ai',
    async run({ reply, text, sock, from, msg }) {
      if (!text) return reply('🎨 Example: .imagine a cool robot');
      const url = `https://api.giftedtech.my.id/api/ai/fluximg?apikey=gifted&prompt=${encodeURIComponent(text)}`;
      await sock.sendMessage(from, {
        image: { url }, caption: `🎨 *${text}*\n> KLAUS XMD`
      }, { quoted: msg }).catch(() => reply('❌ Generation failed.'));
    }
  }
];