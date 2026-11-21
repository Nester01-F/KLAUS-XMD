const fs = require('fs');
const path = require('path');
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

function write(level, msg) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  console.log(line);
  fs.appendFileSync(path.join(logDir, 'bot.log'), line + '\n');
}
module.exports = {
  info: m => write('INFO', m),
  warn: m => write('WARN', m),
  error: m => write('ERROR', m)
};