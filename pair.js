/**
 * KLAUS XMD — Session Pairing Server
 * Deploy to Render/Railway as: node pair.js
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const tar = require('tar');
const P = require('pino');
const QRCode = require('qrcode');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestWaWebVersion,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PAIR_PORT || process.env.PORT || 4000;

app.use(express.json());

/* ---------- In-memory sessions ---------- */
const sessions = new Map();

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

/* ================= API: CREATE SESSION ================= */
app.post('/api/pair', async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\d{8,15}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone. Digits only, no +.' });
  }

  const id = makeId();
  const dir = path.join(os.tmpdir(), 'klaus-sess-' + id);
  fs.mkdirSync(dir, { recursive: true });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(dir);
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
      markOnlineOnConnect: false
    });

    const entry = { sock, dir, code: null, status: 'starting', sessionId: null, createdAt: Date.now() };
    sessions.set(id, entry);

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', ({ connection }) => {
      if (connection === 'open') entry.status = 'connected';
    });

    await new Promise(r => setTimeout(r, 1500));
    const code = await sock.requestPairingCode(phone);
    entry.code = code;
    entry.status = 'awaiting_code';

    res.json({ id, code });
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    sessions.delete(id);
    res.status(500).json({ error: e.message });
  }
});

/* ================= API: STATUS ================= */
app.get('/api/status/:id', async (req, res) => {
  const entry = sessions.get(req.params.id);
  if (!entry) return res.status(404).json({ error: 'Session not found' });

  if (entry.status === 'connected' && !entry.sessionId) {
    const tarPath = path.join(os.tmpdir(), `export-${req.params.id}.tar.gz`);
    try {
      await tar.c({ gzip: true, file: tarPath, cwd: os.tmpdir() }, [path.basename(entry.dir)]);
      const b64 = fs.readFileSync(tarPath).toString('base64');
      fs.unlinkSync(tarPath);
      entry.sessionId = b64;
      entry.status = 'ready';
    } catch (e) {
      return res.status(500).json({ error: 'Export failed: ' + e.message });
    }
  }

  res.json({ status: entry.status, code: entry.code, sessionId: entry.sessionId });
});

/* ================= Web UI ================= */
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>KLAUS XMD — Get Session</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:radial-gradient(circle at 50% 20%,#1a0033,#000010 70%);color:#eee;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:#12121e;border:1px solid #2a2a4a;border-radius:16px;padding:36px;max-width:520px;width:100%;box-shadow:0 0 40px rgba(168,85,247,.3)}
  h1{font-size:28px;letter-spacing:3px;text-align:center;margin-bottom:8px;background:linear-gradient(180deg,#fff,#a855f7 60%,#fff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 20px #a855f7}
  .sub{text-align:center;color:#22d3ee;letter-spacing:4px;font-size:12px;margin-bottom:28px}
  label{display:block;color:#aaa;font-size:13px;margin:14px 0 6px}
  input{width:100%;padding:12px 14px;border-radius:8px;border:1px solid #333;background:#0c0c18;color:#fff;font-size:15px;outline:none}
  input:focus{border-color:#a855f7;box-shadow:0 0 0 2px rgba(168,85,247,.3)}
  button{width:100%;padding:14px;border:none;border-radius:8px;cursor:pointer;background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff;font-weight:700;font-size:15px;letter-spacing:1px;margin-top:22px;transition:transform .1s}
  button:hover{transform:translateY(-1px)}
  button:disabled{opacity:.5;cursor:not-allowed}
  .code{font-family:monospace;font-size:30px;letter-spacing:8px;text-align:center;color:#22d3ee;background:#0c0c18;border:1px dashed #22d3ee;padding:20px;border-radius:10px;margin:20px 0;text-shadow:0 0 10px #22d3ee}
  .step{background:#0f0f1a;padding:12px;border-radius:8px;color:#bbb;font-size:13px;line-height:1.6}
  .step b{color:#a855f7}
  .session-box{background:#0c0c18;border:1px solid #22d3ee;border-radius:10px;padding:14px;max-height:160px;overflow-y:auto;font-family:monospace;font-size:11px;color:#22d3ee;word-break:break-all;margin-top:12px}
  .copy-btn{background:#22d3ee;color:#000;margin-top:10px;font-size:13px;padding:10px}
  .hidden{display:none}
  .status{text-align:center;margin-top:20px;color:#aaa;font-size:13px}
  .status.loading{color:#facc15}
  .status.ok{color:#22d3ee}
  .status.err{color:#ff0055}
</style>
</head>
<body>
<div class="card">
  <h1>KLAUS XMD</h1>
  <div class="sub">GET YOUR SESSION ID</div>

  <div id="step1">
    <label>WhatsApp Number (digits only, no +)</label>
    <input id="phone" placeholder="254701881604" maxlength="15"/>
    <button id="btn">Generate Pairing Code</button>
    <div id="status1" class="status"></div>
  </div>

  <div id="step2" class="hidden">
    <div style="text-align:center;color:#aaa;font-size:13px">Your pairing code</div>
    <div id="code" class="code">----</div>
    <div class="step">
      <b>1.</b> Open WhatsApp → Settings → Linked Devices<br/>
      <b>2.</b> Tap "Link with phone number"<br/>
      <b>3.</b> Enter code above → confirm
    </div>
    <div id="status2" class="status loading">⏳ Waiting for you to enter code...</div>
  </div>

  <div id="step3" class="hidden">
    <div style="text-align:center;color:#22d3ee;font-weight:700;margin-bottom:12px">✅ SESSION READY!</div>
    <div class="step">Copy the SESSION_ID below and paste it as an env var on your bot host (Railway/Heroku).</div>
    <div id="session" class="session-box"></div>
    <button class="copy-btn" id="copyBtn">📋 Copy SESSION_ID</button>
  </div>
</div>

<script>
const $ = id => document.getElementById(id);
let pollTimer = null;

$('btn').onclick = async () => {
  const phone = $('phone').value.trim();
  if (!/^\\d{8,15}$/.test(phone)) {
    $('status1').className = 'status err';
    $('status1').textContent = '❌ Invalid number. Use digits only.';
    return;
  }
  $('btn').disabled = true;
  $('status1').className = 'status loading';
  $('status1').textContent = '⏳ Generating pairing code...';

  try {
    const r = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed');

    $('code').textContent = d.code ? d.code.slice(0,4) + '-' + d.code.slice(4) : '----';
    $('step1').classList.add('hidden');
    $('step2').classList.remove('hidden');
    poll(d.id);
  } catch (e) {
    $('status1').className = 'status err';
    $('status1').textContent = '❌ ' + e.message;
    $('btn').disabled = false;
  }
};

function poll(id) {
  pollTimer = setInterval(async () => {
    try {
      const r = await fetch('/api/status/' + id);
      const d = await r.json();
      if (d.status === 'ready' && d.sessionId) {
        clearInterval(pollTimer);
        $('step2').classList.add('hidden');
        $('step3').classList.remove('hidden');
        $('session').textContent = d.sessionId;
      } else if (d.status === 'connected') {
        $('status2').textContent = '🔐 Connected — generating session...';
      }
    } catch {}
  }, 3000);
}

$('copyBtn').onclick = () => {
  navigator.clipboard.writeText($('session').textContent);
  $('copyBtn').textContent = '✅ Copied!';
  setTimeout(() => $('copyBtn').textContent = '📋 Copy SESSION_ID', 2000);
};
</script>
</body>
</html>`);
});

/* ================= Health check ================= */
app.get('/health', (req, res) => res.send('OK'));

/* ================= Cleanup old sessions ================= */
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (now - entry.createdAt > 10 * 60 * 1000) {
      try { entry.sock?.end?.(); } catch {}
      try { fs.rmSync(entry.dir, { recursive: true, force: true }); } catch {}
      sessions.delete(id);
    }
  }
}, 60 * 1000);

app.listen(PORT, () => {
  console.log(`🌐 Session site: http://localhost:${PORT}`);
});