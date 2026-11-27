/**
 * KLAUS XMD: view-once saver (owner only)
 * Reply to a view-once photo/video/voice note with `.vv`
 * The media is sent to YOUR OWN chat only.
 */

const { downloadMediaMessage, normalizeMessageContent, jidNormalizedUser } = require('@whiskeysockets/baileys');

const WRAPPERS = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
const MEDIA = ['imageMessage', 'videoMessage', 'audioMessage'];

function normalizeNumber(raw) {
  return String(raw || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

module.exports = [
  {
    command: 'vv',
    aliases: ['viewonce', 'retrieve'],
    category: 'owner',
    description: 'Save a view-once photo/video/voice note to your private chat',
    async run({ sock, msg, reply, isOwner, config, sender, logger }) {
      // Owner check
      const senderNum = normalizeNumber(sender);
      const ownerNums = (config.owner || []).map(normalizeNumber);
      const isActuallyOwner = isOwner || ownerNums.includes(senderNum);

      if (!isActuallyOwner) {
        return reply('❌ *Owner only command!*');
      }

      const content = normalizeMessageContent(msg.message);
      const quoted = content?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) {
        return reply('↩️ Reply to a view-once photo, video or voice note with `.vv`');
      }

      const inner = normalizeMessageContent(quoted);
      const type = MEDIA.find(k => inner?.[k]);
      if (!type) {
        return reply('❌ That message is not a photo, video or voice note.');
      }

      const media = inner[type];
      const wasWrapped = WRAPPERS.some(k => quoted[k]);
      if (!wasWrapped && !media.viewOnce) {
        return reply('❌ That is not a view-once message.');
      }

      // Debug log
      logger?.info?.(`[VV] type=${type} wrapped=${wasWrapped} hasKey=${!!media.mediaKey} hasUrl=${!!(media.url || media.directPath)}`);

      if (!media.mediaKey || !(media.url || media.directPath)) {
        return reply(
          '⚠️ *WhatsApp did not include the media*\n\n' +
          'Reasons:\n' +
          '• Already opened on phone\n' +
          '• Expired\n' +
          '• Bot is not registered as Android companion\n\n' +
          '_Reply immediately without opening it first._'
        );
      }

      let buffer;
      try {
        buffer = await downloadMediaMessage(
          { message: quoted, key: msg.key },
          'buffer',
          {},
          { logger: undefined, reuploadRequest: sock.updateMediaMessage }
        );
      } catch (e) {
        logger?.error?.(`[VV] download failed: ${e.message}`);
        return reply(`⚠️ Download failed: ${e.message}`);
      }

      if (!buffer?.length) {
        return reply('⚠️ Empty download — the view-once may have expired.');
      }

      const me = jidNormalizedUser(sock.user.id);
      const note = '👁️ View-once saved';
      const caption = media.caption ? `${note}\n\n${media.caption}` : note;

      try {
        if (type === 'imageMessage') {
          await sock.sendMessage(me, { image: buffer, caption });
        } else if (type === 'videoMessage') {
          await sock.sendMessage(me, { video: buffer, caption, mimetype: media.mimetype || 'video/mp4' });
        } else {
          await sock.sendMessage(me, {
            audio: buffer,
            mimetype: media.mimetype || 'audio/ogg; codecs=opus',
            ptt: !!media.ptt
          });
          await sock.sendMessage(me, { text: note });
        }
        await reply('📥 Saved to your private chat.');
      } catch (e) {
        logger?.error?.(`[VV] send failed: ${e.message}`);
        reply(`❌ Forward failed: ${e.message}`);
      }
    }
  }
];