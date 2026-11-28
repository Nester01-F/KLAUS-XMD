const fs = require('fs');
const path = require('path');
const util = require('util');

const logDir = path.join(__dirname, '../logs');
const logFile = path.join(logDir, 'bot.log');
const MAX_BYTES = 2 * 1024 * 1024; // rotate at 2 MB
const KEEP = 3;                    // bot.log.1 .. bot.log.3

/* ── Levels (set LOG_LEVEL=debug|info|warn|error in your env) ── */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const levelName = (process.env.LOG_LEVEL || 'info').toLowerCase();
const minLevel = LEVELS[levelName] ?? LEVELS.info;

/* ── File setup ─────────────────────────────────────────────── */
let fileLogging = true;
let size = 0; // cached so we don't stat the file on every write
try {
  fs.mkdirSync(logDir, { recursive: true });
  size = fs.existsSync(logFile) ? fs.statSync(logFile).size : 0;
} catch {
  fileLogging = false; // read-only host: console only
}

/* ── Redaction ──────────────────────────────────────────────── */
const REDACTIONS = [
  [/[A-Za-z0-9+/_-]{200,}={0,2}/g, '[redacted]'],                                  // session IDs, big base64 blobs
  [/((?:api[_-]?key|apikey|token|secret|password|session)=)[^&\s"']+/gi, '$1[redacted]'], // ?apikey=... in URLs
  [/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[redacted]']                             // Authorization headers
];

function redact(text) {
  for (const [re, rep] of REDACTIONS) text = text.replace(re, rep);
  return text;
}

/* ── Formatting (supports multiple args, errors, objects) ───── */
function formatOne(v) {
  if (v instanceof Error) return v.stack || v.message;
  if (typeof v === 'string') return v;
  return util.inspect(v, { depth: 3, breakLength: Infinity });
}

const format = (args) => args.map(formatOne).join(' ');

/* ── Rotation ───────────────────────────────────────────────── */
function rotate() {
  try {
    fs.rmSync(`${logFile}.${KEEP}`, { force: true });
    for (let i = KEEP - 1; i >= 1; i--) {
      const from = `${logFile}.${i}`;
      if (fs.existsSync(from)) fs.renameSync(from, `${logFile}.${i + 1}`);
    }
    fs.renameSync(logFile, `${logFile}.1`);
    size = 0;
  } catch {
    size = 0; // don't retry on every line if rename fails
  }
}

/* ── Core writer ────────────────────────────────────────────── */
function write(level, args) {
  if (LEVELS[level] < minLevel) return;

  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${redact(format(args))}`;

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);

  if (!fileLogging) return;
  try {
    const data = line + '\n';
    if (size + data.length > MAX_BYTES) rotate();
    fs.appendFileSync(logFile, data);
    size += data.length;
  } catch {
    fileLogging = false; // stop trying if the disk is unwritable
  }
}

const logger = {
  debug: (...a) => write('debug', a),
  info:  (...a) => write('info', a),
  warn:  (...a) => write('warn', a),
  error: (...a) => write('error', a),

  // Optional pino-style compatibility, so this can be passed to Baileys as `logger`
  // (set LOG_LEVEL=warn or error to keep Baileys quiet)
  level: levelName,
  trace: () => {},
  fatal: (...a) => write('error', a),
  child() { return logger; }
};

module.exports = logger;