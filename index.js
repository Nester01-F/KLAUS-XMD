const baileys = require('@whiskeysockets/baileys');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  Browsers
} = baileys;
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const qrcode = require('qrcode-terminal');

const config = require('./config');

// Guard: if the session ID was pasted into the session-NAME setting, the "folder name"
// would be thousands of characters long (ENAMETOOLONG). Detect it and use a normal folder.
let misplacedSession = null;
if (String(config.sessionName || '').length > 60) {
  misplacedSession = String(config.sessionName);
  config.sessionName = 'session';
}
const logger = require('./lib/logger');
const database = require('./lib/database');
const { loadDB, bumpStat } = database;
// Fallback so a missing export can never crash command handling
const addCommandUse = database.addCommandUse || (() => {});
const { guardMessage } = require('./lib/guard');
const { handleGroupParticipants } = require('./lib/events');
const { restoreSession, exportSession } = require('./lib/session');
const {
  autoViewStatus, autoReactCommand, autoRead, autoTyping,
  startAutoBio, autoBlockCheck
} = require('./lib/automation');
const { handleCall } = require('./lib/callHandler');
const { saveStatus } = require('./lib/statusSaver');

const plugins = new Map();
let reconnectAttempts = 0;
let startTime = Date.now();

// Login choice is asked ONCE, before any socket exists
let loginChoice = null;   // '1' = QR, '2' = pairing code
let pairingPhone = null;
let sessionRestored = false;

/* ---------- Restore a creds-only SESSION_ID into <session>/creds.json ---------- */
function restoreCredsFromEnv(dir) {
  const credsFile = path.join(dir, 'creds.json');
  if (fs.existsSync(credsFile)) return;
  const id = String(process.env.SESSION_ID || misplacedSession || '')
    .trim().replace(/^['"]|['"]$/g, '');
  if (!id) return;
  try {
    const text = Buffer.from(id, 'base64').toString('utf8');
    JSON.parse(text); // only accept valid creds JSON
    fs.writeFileSync(credsFile, text);
    logger.info('Session restored from SESSION_ID');
  } catch {
    // not a creds-only ID: the legacy restoreSession() may still handle it
  }
}

/* ---------- Load plugins ---------- */
function loadPlugins() {
  const dir = path.join(__dirname, 'plugins');
  fs.readdirSync(dir).forEach(file => {
    if (!file.endsWith('.js')) return;
    delete require.cache[require.resolve(path.join(dir, file))];
    try {
      const plugin = require(path.join(dir, file));
      const arr = Array.isArray(plugin) ? plugin : [plugin];
      arr.forEach(p => p?.command && plugins.set(p.command.toLowerCase(), p));
      logger.info(`Loaded plugin: ${file}`);
    } catch (e) {
      logger.error(`Plugin ${file} failed: ${e.message}`);
    }
  });
  logger.info(`Total commands: ${plugins.size}`);
}

/* ---------- Readline ---------- */
function question(text) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(text, ans => { rl.close(); res(ans.trim()); }));
}

/* ---------- Keep-alive ---------- */
function startKeepAlive(sock) {
  const pingTimer = setInterval(() => {
    try {
      if (sock.ws && typeof sock.ws.ping === 'function') sock.ws.ping();
    } catch {}
  }, 20 * 1000);

  const presenceTimer = setInterval(() => {
    try {
      const open = sock.ws && sock.ws.readyState === 1;
      if (open) sock.sendPresenceUpdate('available').catch(() => {});
    } catch {}
  }, 30 * 1000);

  const healthTimer = setInterval(() => {
    const up = Math.floor((Date.now() - startTime) / 1000);
    const d = Math.floor(up / 86400);
    const h = Math.floor((up % 86400) / 3600);
    const m = Math.floor((up % 3600) / 60);
    logger.info(`Alive ${d}d ${h}h ${m}m | ws: ${sock.ws?.readyState === 1 ? 'open' : 'closed'}`);
  }, 5 * 60 * 1000);

  sock.ev.on('connection.update', ({ connection }) => {
    if (connection === 'close') {
      clearInterval(pingTimer);
      clearInterval(presenceTimer);
      clearInterval(healthTimer);
    }
  });

  logger.info('Keep-alive started (ping 20s / presence 30s / health 5m)');
}

/* ---------- Connection message ---------- */
async function sendConnectedMessage(sock) {
  const up = Math.floor((Date.now() - startTime) / 1000);
  const d = Math.floor(up / 86400);
  const h = Math.floor((up % 86400) / 3600);
  const m = Math.floor((up % 3600) / 60);

  const caption =
`╭━━〔 *${config.botName}* 〕━━⬣
┃ ✅ Status  : *ONLINE*
┃ ⏱️ Uptime  : *${d}d ${h}h ${m}m*
┃ 📦 Commands: *${plugins.size}*
┃ ⚙️ Prefix  : *${config.prefix}*
┃ 🔐 Session : *Active*
┃ 💓 KeepAlive: *ON*
╰━━━━━━━━━━━━━━━━━━⬣

> _KLAUS XMD © Warrior Felix_`;

  await sock.sendMessage(sock.user.id, {
    image: { url: config.images.alive },
    caption
  }).catch(() => {});

  const ownerJid = config.owner[0] + '@s.whatsapp.net';
  if (ownerJid !== sock.user.id) {
    await sock.sendMessage(ownerJid, {
      image: { url: config.images.alive },
      caption
    }).catch(() => {});
  }
}

/* ---------- Start bot ---------- */
async function startBot() {
  const sessionPath = path.join(__dirname, config.sessionName);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
    logger.info(`Created session folder: ${sessionPath}`);
  }

  // Only restore on the first start, never on reconnects
  // (a restart right after pairing must not overwrite the new login)
  if (!sessionRestored) {
    restoreCredsFromEnv(sessionPath);
    if (!fs.existsSync(path.join(sessionPath, 'creds.json'))) {
      try { restoreSession(); } catch (e) { logger.error('restoreSession: ' + e.message); }
    }
    sessionRestored = true;
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  // Ask login questions BEFORE creating the socket
  // On a host with no keyboard (Heroku etc.) we can't ask questions: fail loudly instead of hanging
  if (!state.creds.registered && !process.stdin.isTTY) {
    logger.error('No valid session found. SESSION_ID is missing, wrong, or restoreSession() did not write creds.json. Exiting.');
    process.exit(1);
  }

  if (!state.creds.registered && loginChoice === null) {
    const method = await question('Login method? (1 = QR, 2 = Pairing Code): ');
    loginChoice = method === '2' ? '2' : '1';
    if (loginChoice === '2') {
      pairingPhone = (await question('Enter WhatsApp number (e.g. 2547XXXXXXXX): ')).replace(/\D/g, '');
    }
  }

  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch (e) {
    logger.warn('Could not fetch latest version, using Baileys default: ' + e.message);
  }

  const sock = makeWASocket({
    ...(version ? { version } : {}),
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
    },
    browser: Browsers ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '20.0.04'],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    keepAliveIntervalMs: 25000,
    connectTimeoutMs: 60000
  });

  sock.ev.on('creds.update', saveCreds);

  /* ---------- Pairing code (requested right after socket starts) ---------- */
  let pairingCodeRequested = false;
  if (!state.creds.registered && loginChoice === '2' && pairingPhone) {
    pairingCodeRequested = true;
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(pairingPhone);
        console.log(`\n🔑 PAIRING CODE: ${code}\n`);
        console.log('WhatsApp > Settings > Linked devices > Link a device > Link with phone number instead\n');
      } catch (e) {
        logger.error('Pairing failed: ' + e.message);
        pairingCodeRequested = false;
      }
    }, 3000);
  }

  /* ---------- Call handler ---------- */
  sock.ev.on('call', async (calls) => {
    for (const call of calls) {
      if (call.status === 'offer') await handleCall(sock, call);
    }
  });

  /* ---------- Status viewer + saver ---------- */
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') {
        await autoViewStatus(sock, [msg]);
        await saveStatus(sock, msg);
      }
    }
  });

  /* ---------- Group participants ---------- */
  sock.ev.on('group-participants.update', (update) =>
    handleGroupParticipants({ sock, update })
      .catch(e => logger.error('GP update: ' + e.message))
  );

  /* ---------- Connection update ---------- */
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && loginChoice === '1' && !sock.authState.creds.registered) {
      console.log('\n📲 Scan QR:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      logger.info(`${config.botName} connected!`);
      reconnectAttempts = 0;
      startTime = Date.now();

      startKeepAlive(sock);
      await sendConnectedMessage(sock);
      setTimeout(() => { try { exportSession(); } catch (e) { logger.error('exportSession: ' + e.message); } }, 2000);
      startAutoBio(sock);
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reason = DisconnectReason[code] || 'unknown';

      logger.warn(`Connection closed (${code} / ${reason}): ${lastDisconnect?.error?.message || ''}`);

      if (code === DisconnectReason.loggedOut) {
        logger.error('Logged out. Delete the session folder and re-login.');
        process.exit(1);
      }

      // 515 (restartRequired) is expected right after pairing: reconnect fast
      reconnectAttempts++;
      const delay = code === DisconnectReason.restartRequired
        ? 1000
        : Math.min(2000 * reconnectAttempts, 10000);
      logger.info(`Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})...`);

      setTimeout(() => startBot(), delay);
    }
  });

  /* ---------- Main message handler ---------- */
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg || !msg.message) return;
    if (msg.key.remoteJid === 'status@broadcast') return;

    const from = msg.key.remoteJid;
    const fromMe = !!msg.key.fromMe;
    const sender = fromMe
      ? jidNormalizedUser(sock.user.id)
      : jidNormalizedUser(msg.key.participant || msg.key.remoteJid);
    const isGroup = from.endsWith('@g.us');

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption || '';

    // Messages typed from the bot's own phone are "fromMe": only treat them as commands
    if (fromMe && !body.startsWith(config.prefix)) return;

    if (!fromMe) {
      try { await autoRead(sock, msg); } catch (e) { logger.error('autoRead: ' + e.message); }
      try { await autoBlockCheck(sock, sender); } catch (e) { logger.error('autoBlock: ' + e.message); }

      try {
        const handled = await guardMessage({ sock, msg, from, sender, text: body });
        if (handled) return;
      } catch (e) { logger.error('Guard error: ' + e.message); }
    }

    if (!body.startsWith(config.prefix)) return;

    const args = body.slice(config.prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const text = args.join(' ');

    const plugin = plugins.get(cmd);
    logger.info(`Command "${cmd}" from ${sender}${plugin ? '' : ' (no such command)'}`);
    if (!plugin) return;

    const isOwner = config.owner.includes(sender.split('@')[0]);
    bumpStat('commands');
    addCommandUse(sender);

    try {
      try { await autoReactCommand(sock, msg); } catch (e) { logger.error('autoReact: ' + e.message); }
      try { await autoTyping(sock, from); } catch (e) { logger.error('autoTyping: ' + e.message); }

      await plugin.run({
        sock, msg, from, sender, isGroup,
        args, text, cmd, isOwner,
        reply: (t, opts = {}) => sock.sendMessage(from, { text: t, ...opts }, { quoted: msg }),
        config, plugins, logger
      });
    } catch (e) {
      logger.error(`Cmd ${cmd} error: ${e.message}`);
      sock.sendMessage(from, { text: config.messages.error }, { quoted: msg });
    }
  });
}

/* ---------- Boot ---------- */
loadPlugins();
loadDB();
startBot();

/* ---------- Hot reload ---------- */
fs.watch(path.join(__dirname, 'plugins'), (evt, file) => {
  if (file && file.endsWith('.js')) {
    logger.info(`Reloading ${file}`);
    loadPlugins();
  }
});