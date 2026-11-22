module.exports = [
  /* ================= VV — Retrieve View Once ================= */
  {
    command: 'vv',
    aliases: ['viewonce', 'retrieve'],
    description: 'Retrieve a view-once image/video',
    category: 'tools',
    async run({ sock, msg, from, reply }) {
      const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quoted) {
        return reply('👁️ Reply to a view-once image/video with `.vv`');
      }

      try {
        let mediaMsg = null;
        let type = null;

        // Handle different view-once wrappers
        if (quoted.viewOnceMessageV2) {
          mediaMsg = quoted.viewOnceMessageV2.message;
        } else if (quoted.viewOnceMessage) {
          mediaMsg = quoted.viewOnceMessage.message;
        } else if (quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce) {
          mediaMsg = quoted;
        } else {
          return reply('❌ This is not a view-once message.');
        }

        // Extract image or video
        if (mediaMsg?.imageMessage) {
          type = 'image';
          mediaMsg = mediaMsg.imageMessage;
        } else if (mediaMsg?.videoMessage) {
          type = 'video';
          mediaMsg = mediaMsg.videoMessage;
        } else if (mediaMsg?.audioMessage) {
          type = 'audio';
          mediaMsg = mediaMsg.audioMessage;
        } else {
          return reply('❌ Unsupported media type in view-once.');
        }

        // Download the media
        const buf = await sock.downloadMediaMessage(
          { message: { [type + 'Message']: mediaMsg } },
          'buffer',
          {},
          {}
        );

        if (!buf || buf.length === 0) {
          throw new Error('Empty buffer — media not available');
        }

        const caption = mediaMsg.caption || '';

        if (type === 'image') {
          await sock.sendMessage(from, {
            image: buf,
            caption: `👁️ *View Once Retrieved*\n\n${caption}`
          }, { quoted: msg });
        } else if (type === 'video') {
          await sock.sendMessage(from, {
            video: buf,
            caption: `👁️ *View Once Retrieved*\n\n${caption}`
          }, { quoted: msg });
        } else if (type === 'audio') {
          await sock.sendMessage(from, {
            audio: buf,
            mimetype: 'audio/mp4'
          }, { quoted: msg });
        }
      } catch (e) {
        reply(`❌ Failed to retrieve: ${e.message}`);
      }
    }
  },

  /* ================= ANTIVIEWONCE — Auto-forward to Owner ================= */
  {
    command: 'antiviewonce',
    aliases: ['avv', 'antivo'],
    description: 'Toggle auto-forwarding of view-once to owner',
    category: 'settings',
    owner: true,
    async run({ reply, args, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');

      const mode = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(mode)) {
        return reply('👁️ Usage: .antiviewonce on | off');
      }

      // Store in DB — we'll use the existing bot settings
      const { getBot, setBot } = require('../lib/database');
      setBot({ antiviewonce: mode === 'on' });

      reply(`👁️ *AntiViewOnce ${mode === 'on' ? 'ENABLED ✅' : 'DISABLED ❌'}*\n\n${mode === 'on' ? 'All view-once media will be forwarded to owner.' : 'View-once media will be ignored.'}`);
    }
  }
];