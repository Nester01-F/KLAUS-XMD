const { panel, fmtUptime, hostName } = require('../lib/ui');

module.exports = {
  command: 'ping',
  description: 'Latency check',
  category: 'main',
  async run({ sock, from, reply, config }) {
    // Time how long WhatsApp takes to accept our message (round trip)
    const t = Date.now();
    const sent = await reply('🏓 Pinging...');
    const ms = Date.now() - t;

    const quality = ms < 300 ? '🟢 Excellent' : ms < 800 ? '🟡 Good' : '🔴 Slow';

    const card = panel('🏓 PONG!', [
      ['⚡ Speed', `*${ms} ms*`],
      ['📶 Quality', `*${quality}*`],
      ['⏱️ Uptime', `*${fmtUptime(process.uptime() * 1000)}*`],
      ['💾 Memory', `*${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB*`],
      ['🌐 Host', `*${hostName()}*`]
    ]) + `\n_⚡ ${config.botName}_`;

    // Replace "Pinging..." with the result; if editing is not possible, send a new message
    try {
      if (!sent?.key) throw new Error('no key');
      await sock.sendMessage(from, { text: card, edit: sent.key });
    } catch {
      await reply(card);
    }
  }
};