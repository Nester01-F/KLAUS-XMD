/**
 * Session helpers.
 *  - restoreSession(): rebuilds <session>/creds.json from the SESSION_ID env var.
 *    Accepts BOTH formats:
 *      1) new  : base64 of creds.json            (short, what pair.js now makes)
 *      2) old  : base64 of a .tar.gz of the folder (legacy)
 *  - exportSession(): prints the SESSION_ID only when EXPORT_SESSION=true
 *    (logs are often shared or stored, so it is off by default)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const logger = require('./logger');
const config = require('../config');

// Always the same folder index.js uses. Never build a folder name from a long value.
function getSessionDir() {
  const name = String(config.sessionName || 'session');
  return path.join(__dirname, '..', name.length > 60 ? 'session' : name);
}

function cleanId(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

function restoreSession() {
  const encoded = cleanId(process.env.SESSION_ID);
  if (!encoded) {
    logger.info('No SESSION_ID env: a fresh login will be required.');
    return;
  }

  const dir = getSessionDir();
  const credsFile = path.join(dir, 'creds.json');
  if (fs.existsSync(credsFile)) return; // never overwrite an existing login

  fs.mkdirSync(dir, { recursive: true });

  let buf;
  try {
    buf = Buffer.from(encoded, 'base64');
  } catch {
    logger.error('SESSION_ID is not valid base64.');
    return;
  }

  // Format 1: creds.json
  try {
    const text = buf.toString('utf8');
    JSON.parse(text);
    fs.writeFileSync(credsFile, text);
    logger.info('Session restored from SESSION_ID (creds).');
    return;
  } catch {}

  // Format 2: legacy gzip tar (starts with bytes 1f 8b)
  if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'klaus-restore-'));
    try {
      const tar = require('tar');
      const tarFile = path.join(tmp, 'session.tar.gz');
      fs.writeFileSync(tarFile, buf);
      tar.x({ file: tarFile, cwd: tmp, sync: true });
      fs.rmSync(tarFile, { force: true });

      // The archive holds one top-level folder: copy its contents into the session dir
      const top = fs.readdirSync(tmp).find(n => fs.statSync(path.join(tmp, n)).isDirectory());
      const from = top ? path.join(tmp, top) : tmp;
      fs.cpSync(from, dir, { recursive: true });
      logger.info('Session restored from SESSION_ID (legacy archive).');
    } catch (e) {
      logger.error('Could not restore legacy SESSION_ID: ' + e.message);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
    return;
  }

  logger.error('SESSION_ID is not a recognised format. Generate a new one with pair.js.');
}

function exportSession() {
  if (process.env.EXPORT_SESSION !== 'true') return;
  try {
    const raw = fs.readFileSync(path.join(getSessionDir(), 'creds.json'), 'utf8');
    const b64 = Buffer.from(raw, 'utf8').toString('base64');
    logger.info('\nSESSION_ID (keep this secret):\n' + b64 + '\n');
  } catch (e) {
    logger.error('exportSession failed: ' + e.message);
  }
}

module.exports = { restoreSession, exportSession };