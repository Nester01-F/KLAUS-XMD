const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const SESSION_DIR = path.join(__dirname, '..', process.env.SESSION_NAME || 'session');

/**
 * Restore session from SESSION_ID env var (Base64 tar of the folder).
 * Call this BEFORE useMultiFileAuthState().
 */
function restoreSession() {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  const encoded = process.env.SESSION_ID;
  if (!encoded) {
    logger.info('🔓 No SESSION_ID env — fresh login will be required.');
    return false;
  }

  try {
    const tar = require('tar');
    const tmp = path.join(__dirname, '..', 'session-restore.tar');
    fs.writeFileSync(tmp, Buffer.from(encoded, 'base64'));
    tar.x({ file: tmp, cwd: path.join(__dirname, '..') }).then(() => {
      fs.unlinkSync(tmp);
      logger.info('✅ Session restored from SESSION_ID.');
    });
    return true;
  } catch (e) {
    logger.error('Session restore failed: ' + e.message);
    return false;
  }
}

/**
 * Export current session folder as Base64 tar (for SESSION_ID env).
 * Call after successful login to print the code the user should paste on Heroku.
 */
function exportSession() {
  try {
    const tar = require('tar');
    const out = path.join(__dirname, '..', 'session-export.tar');
    tar.c({ gzip: true, file: out, cwd: path.join(__dirname, '..') }, [path.basename(SESSION_DIR)])
      .then(() => {
        const b64 = fs.readFileSync(out).toString('base64');
        fs.unlinkSync(out);
        logger.info('\n📋 SESSION_ID (paste this into Heroku/Railway env var):\n');
        console.log('\x1b[36m%s\x1b[0m', b64);
        console.log('\n');
      });
    return true;
  } catch (e) {
    logger.error('Session export failed: ' + e.message);
    return false;
  }
}

module.exports = { restoreSession, exportSession };