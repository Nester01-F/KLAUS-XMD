/**
 * KLAUS XMD: view-once saver (owner only)
 * Save as plugins/viewonce.js
 *
 * Usage: reply to a view-once photo, video or voice note with  .vv  (or .viewonce)
 * The media is sent to YOUR OWN chat only, never to the chat the command was used in,
 * so it is not re-shared with a group or with the sender.
 *
 * Only use it on media that was sent to you, and respect the sender's privacy.
 */

const { downloadContentFromMessage, normalizeMessageContent, jidNormalizedUser } = require('@whiskeysockets/baileys');

const WRAPPERS = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
const MEDIA = ['imageMessage', 'videoMessage', 'audioMessage'];

async function toBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function reveal({ sock, msg, reply, isOwner, config }) {
  if (!isOwner) return reply(config?.messages?.notOwner || '❌ *Owner only command!*');

  const content = normalizeMessageContent(msg.message);
  const quoted = content?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) return reply('↩️ Reply to a view-once photo, video or voice note with *.vv*');

  const inner = normalizeMessageContent(quoted);
  const type = MEDIA.find(k => inner?.[k]);
  if (!type) return reply('❌ That message is not a photo, video or voice note.');

  const media = inner[type];
  const wasWrapped = WRAPPERS.some(k => quoted[k]);
  if (!wasWrapped && !media.viewOnce) return reply('❌ That is not a view-once message.');

  if (!media.mediaKey || !(media.url || media.directPath)) {
    return reply(
      '⚠️ WhatsApp did not include the media in this reply (it may already have been opened or have expired). ' +
        'Try replying as soon as it arrives.'
    );
  }

  let buffer;
  try {
    buffer = await toBuffer(await downloadContentFromMessage(media, type.replace('Message', '')));
  } catch {
    return reply('⚠️ Could not download it. It may already have been opened or have expired.');
  }
  if (!buffer.length) return reply('⚠️ Could not download it. It may already have been opened or have expired.');

  const me = jidNormalizedUser(sock.user.id);
  const note = '👁️ View-once saved';
  const caption = media.caption ? `${note}\n\n${media.caption}` : note;

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
}

module.exports = [
  { command: 'vv', category: 'owner', description: 'Save a view-once photo/video/voice note to your private chat', usage: '.vv (reply to it)', run: reveal },
  { command: 'viewonce', category: 'owner', description: 'Same as .vv', usage: '.viewonce (reply to it)', run: reveal }
];