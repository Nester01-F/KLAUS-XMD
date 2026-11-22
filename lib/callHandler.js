const { getBot } = require('./database');
const logger = require('./logger');

async function handleCall(sock, call) {
  const bot = getBot();
  if (!bot.autorejectcall) return;

  const from = call.from;
  const callId = call.id;

  try {
    await sock.rejectCall(callId, from);
    logger.info(`📞 Rejected call from ${from.split('@')[0]}`);
    await sock.sendMessage(from, {
      text: bot.callRejectMsg || '📞 Auto-rejected. Send a message instead!'
    });
  } catch (e) {
    logger.warn(`Call reject failed: ${e.message}`);
  }
}

module.exports = { handleCall };