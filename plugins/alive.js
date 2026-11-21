const { runtime } = require('../lib/helper');
const start = Date.now();

module.exports = {
  command: 'alive',
  description: 'Check bot status',
  category: 'main',
  async run({ sock, from, reply, config }) {
    const up = runtime((Date.now() - start) / 1000);
    await sock.sendMessage(from, {
      image: { url: config.images.alive },
      caption:
`╭━〔 *${config.botName}* 〕━⬣
┃ ✅ Status : *ONLINE*
┃ ⏱️ Uptime : *${up}*
┃ ⚙️ Prefix : *${config.prefix}*
┃ 🧠 Mode   : *Public*
╰━━━━━━━━━━━━━━━━⬣
> _Powered by KLAUS TECH_`
    });
  }
};