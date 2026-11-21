const axios = require('axios');

module.exports = [
  {
    command: 'weather',
    description: 'Get weather',
    category: 'tools',
    async run({ reply, text }) {
      if (!text) return reply('🌤️ Example: .weather Nairobi');
      try {
        const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=j1`);
        const c = data.current_condition[0];
        reply(
`🌍 *${text}*
🌡️ Temp: *${c.temp_C}°C*
☁️ ${c.weatherDesc[0].value}
💧 Humidity: ${c.humidity}%
💨 Wind: ${c.windspeedKmph} km/h`
        );
      } catch { reply('❌ Weather failed.'); }
    }
  },
  {
    command: 'translate',
    description: 'Translate text',
    category: 'tools',
    async run({ reply, text }) {
      const [lang, ...rest] = text.split(' ');
      const q = rest.join(' ');
      if (!lang || !q) return reply('🌐 Example: .translate es hello world');
      try {
        const { data } = await axios.get(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(q)}`
        );
        reply(`🌐 *${lang.toUpperCase()}*\n${data[0].map(x => x[0]).join('')}`);
      } catch { reply('❌ Translation failed.'); }
    }
  },
  {
    command: 'qr',
    description: 'Generate QR code',
    category: 'tools',
    async run({ sock, from, msg, reply, text }) {
      if (!text) return reply('🔳 Example: .qr hello');
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(text)}`;
      await sock.sendMessage(from, { image: { url }, caption: '🔳 KLAUS XMD' }, { quoted: msg });
    }
  }
];