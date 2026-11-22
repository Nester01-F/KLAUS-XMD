const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');
const logFile = path.join(logDir, 'bot.log');
const MAX_BYTES = 2 * 1024 * 1024; // rotate at 2 MB so the disk never fills up

let fileLogging = true;
try {
  fs.mkdirSync(logDir, { recursive: true });
} catch {
  fileLogging = false; // read-only host: keep logging to the console only
}

// Never let a session ID or other long base64 blob reach the logs
function redact(text) {
  return text.replace(/[A-Za-z0-9+/_-]{200,}={0,2}/g, '[redacted]');
}

function format(msg) {
  if (msg instanceof Error) return msg.stack || msg.message;
  if (typeof msg === 'string') return msg;
  try { return JSON.stringify(msg); } catch { return String(msg); }
}

function rotateIfNeeded() {
  try {
    if (fs.statSync(logFile).size > MAX_BYTES) {
      fs.renameSync(logFile, logFile + '.1'); // keeps one old file, replaces the previous one
    }
  } catch {}
}

function write(level, msg) {
  const line = `[${new Date().toISOString()}] [${level}] ${redact(format(msg))}`;
  console.log(line);
  if (!fileLogging) return;
  try {
    rotateIfNeeded();
    fs.appendFileSync(logFile, line + '\n');
  } catch {
    fileLogging = false; // stop trying if the disk is unwritable
  }
}

module.exports = {
  info: m => write('INFO', m),
  warn: m => write('WARN', m),
  error: m => write('ERROR', m)
};