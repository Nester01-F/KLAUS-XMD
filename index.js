cat > index.js << 'EOF'
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
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
const { loadDB, bumpStat } = require('./lib/database');
const { guardMessage } = require('./lib/guard');
const { handleGroupParticipants } = require('./lib/events');
const { restoreSession, exportSession } = require('./lib/session');
const {
  autoViewStatus, autoReactCommand, autoRead, autoTyping,
  startAutoBio, autoBlockCheck
} = require('./lib/automation');

const plugins = new Map();

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

/* ---------- Start bot ---------- */
async function startBot() {
  const sessionPath = path.join(__dirname, config.sessionName);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
    logger.info(`📁 Created session folder: ${sessionPath}`);
  }

  restoreSession();

  const { state, saveCreds } = await useMultiFileAuthState(config.sessionName);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }))
    },
    browser: ['KLAUS XMD', 'Chrome', '1.0.0'],
    generateHighQualityLinkPreview: true
  });

  if (!sock.authState.creds.registered) {
    const method = await question('Login method? (1 = QR, 2 = Pairing Code): ');
    if (method === '2') {
      const phone = await question('Enter WhatsApp number (e.g. 2547XXXXXXXX): ');
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phone);
          console.log(`\n🔑 *PAIRING CODE:* ${code}\n`);
        } catch (e) { logger.error('Pairing failed: ' + e.message); }
      }, 3000);
    }
  }

  sock.ev.on('creds.update', saveCreds);

  /* ---------- 👁️ STATUS AUTOMATION ---------- */
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') {
        await autoViewStatus(sock, [msg]);
      }
    }
  });

  /* ---------- Group participants ---------- */
  sock.ev.on('group-participants.update', (update) =>
    handleGroupParticipants({ sock, update })
      .catch(e => logger.error('GP update: ' + e.message))
  );

  /* ---------- Connection update ---------- */
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr && !sock.authState.creds.registered) {
      console.log('\n📲 Scan QR:\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      logger.info(`✅ ${config.botName} connected!`);
      sock.sendMessage(sock.user.id, {
        image: { url: config.images.alive },
        caption: `✅ *${config.botName} is ONLINE!*\n\nPrefix: \`${config.prefix}\`\nType ${config.prefix}menu`
      }).catch(() => {});
      setTimeout(() => exportSession(), 2000);
      startAutoBio(sock);
    }
    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        logger.warn('Logged out — delete session folder and re-login.');
        process.exit(1);
      } else {
        logger.warn('Reconnecting...');
        setTimeout(startBot, 3000);
      }
    }
  });

  /* ---------- Messages ---------- */
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const sender = jidNormalizedUser(msg.key.participant || msg.key.remoteJid);
    const isGroup = from.endsWith('@g.us');

    // 📖 AutoRead
    await autoRead(sock, msg);

    // 🛡️ AutoBlock
    await autoBlockCheck(sock, sender);

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption || '';

    // 🛡️ Guard
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

    try {
      // ❤️ AutoReact to command
      await autoReactCommand(sock, msg);
      // ⌨️ AutoTyping
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
EOF
echo "✅ index.js updated with automation wired"