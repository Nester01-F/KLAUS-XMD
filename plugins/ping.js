module.exports = {
  command: 'ping',
  description: 'Latency check',
  category: 'main',
  async run({ reply }) {
    const t = Date.now();
    const m = await reply('🏓 Pinging...');
    // Simple latency = round-trip approx
    reply(`🏓 *Pong!*\n⚡ Speed: *${Date.now() - t} ms*`);
  }
};