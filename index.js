const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
  jidNormalizedUser,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const P = require('pino');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const qrcode = require('qrcode-terminal');

const config = require('./config');
const logger = require('./lib/logger');
const { loadDB, bumpStat, addCommandUse } = require('./lib/database');
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

/* ---------- 💓 Keep-alive (inline) ---------- */
function startKeepAlive(sock) {
  // Ping every 20s
  const pingTimer = setInterval(() => {
    try {
      if (sock.ws && typeof sock.ws.ping === 'function') sock.ws.ping();
    } catch {}
  }, 20 * 1000);

  // Presence every 30s
  const presenceTimer = setInterval(() => {
    try {
      const open = sock.ws && sock.ws.readyState === 1;
      if (open) sock.sendPresenceUpdate('available').catch(() => {});
    } catch {}
  }, 30 * 1000);

  // Health log every 5 min
  const healthTimer = setInterval(() => {
    const up = Math.floor((Date.now() - startTime) / 1000);
    const d = Math.floor(up / 86400);
    const h = Math.floor((up % 86400) / 3600);
    const m = Math.floor((up % 3600) / 60);
    logger.info(`💓 Alive ${d}d ${h}h ${m}m | ws: ${sock.ws?.readyState === 1 ? 'open' : 'closed'}`);
  }, 5 * 60 * 1000);

  // Clear on close
  sock.ev.on('connection.update', ({ connection }) => {
    if (connection === 'close') {
      clearInterval(pingTimer);
      clearInterval(presenceTimer);
      clearInterval(healthTimer);
    }
  });

  logger.info('💓 Keep-alive started (ping 20s / presence 30s / health 5m)');
}

/* ---------- 🎨 Connection message ---------- */
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

  // Send to self
  await sock.sendMessage(sock.user.id, {
    image: { url: config.images.alive },
    caption
  }).catch(() => {});

  // Also send to owner DM if different
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
    logger.info(`📁 Created session folder: ${sessionPath}`);
  }

  restoreSession();

  const { state, saveCreds } = await useMultiFileAuthState(config.sessionName);
  const { version } = await fetchLatestWaWebVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
    },
    browser: ['Mac OS', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    keepAliveIntervalMs: 25000,
    connectTimeoutMs: 60000
  });

  let pairingCodeRequested = false;

  sock.ev.on('creds.update', saveCreds);

  /* ---------- 📞 Call handler ---------- */
  sock.ev.on('call', async (calls) => {
    for (const call of calls) {
      if (call.status === 'offer') await handleCall(sock, call);
    }
  });

  /* ---------- 👁️ Status viewer + saver ---------- */
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') {
        await autoViewStatus(sock, [msg]);
        await saveStatus(sock, msg);
      }
    }
  });

  /* ---------- 👋 Group participants ---------- */
  sock.ev.on('group-participants.update', (update) =>
    handleGroupParticipants({ sock, update })
      .catch(e => logger.error('GP update: ' + e.message))
  );

  /* ---------- 🔗 Connection update ---------- */
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    // Pairing code — only when connecting
    if (connection === 'connecting' && !sock.authState.creds.registered && !pairingCodeRequested) {
      pairingCodeRequested = true;
      const method = await question('Login method? (1 = QR, 2 = Pairing Code): ');
      if (method === '2') {
        const phone = await question('Enter WhatsApp number (e.g. 2547XXXXXXXX): ');
        try {
          await new Promise(r => setTimeout(r, 1500));
          const code = await sock.requestPairingCode(phone.trim());
          console.log(`\n🔑 *PAIRING CODE:* ${code}\n`);
        } catch (e) {
          logger.error('Pairing failed: ' + e.message);
          pairingCodeRequested = false;
        }
      }
    }

    if (qr && !sock.authState.creds.registered) {
      console.log('\n📲 Scan QR:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      logger.info(`✅ ${config.botName} connected!`);
      reconnectAttempts = 0;
      startTime = Date.now();

      startKeepAlive(sock);              // 💓 keep-alive
      await sendConnectedMessage(sock);  // 🎨 cool connected msg
      setTimeout(() => exportSession(), 2000);
      startAutoBio(sock);
    }

    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reason = DisconnectReason[code] || 'unknown';

      logger.warn(`🔌 Connection closed (${code} / ${reason})`);

      if (code === DisconnectReason.loggedOut) {
        logger.error('❌ Logged out — delete session folder and re-login.');
        process.exit(1);
      }

      // Smart reconnect with backoff
      reconnectAttempts++;
      const delay = Math.min(2000 * reconnectAttempts, 10000);
      logger.info(`♻️ Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})...`);

      setTimeout(() => {
        pairingCodeRequested = false;
        startBot();
      }, delay);
    }
  });

  /* ---------- 💬 Main message handler ---------- */
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    if (msg.key.remoteJid === 'status@broadcast') return;

    const from = msg.key.remoteJid;
    const sender = jidNormalizedUser(msg.key.participant || msg.key.remoteJid);
    const isGroup = from.endsWith('@g.us');

    await autoRead(sock, msg);
    await autoBlockCheck(sock, sender);

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption || '';

    try {
      const handled = await guardMessage({ sock, msg, from, sender, text: body });
      if (handled) return;
    } catch (e) { logger.error('Guard error: ' + e.message); }

    if (!body.startsWith(config.prefix)) return;

    const args = body.slice(config.prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const text = args.join(' ');

    const plugin = plugins.get(cmd);
    if (!plugin) return;

    const isOwner = config.owner.includes(sender.split('@')[0]);
    bumpStat('commands');
    addCommandUse(sender);

    try {
      await autoReactCommand(sock, msg);
      await autoTyping(sock, from);

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
    logger.info(`♻️ Reloading ${file}`);
    loadPlugins();
  }
});