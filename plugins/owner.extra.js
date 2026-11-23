/**
 * KLAUS XMD: owner profile tools + eval
 * Save as plugins/owner-tools.js (replaces the plugin file that holds setpp/setname/setbio/eval)
 *
 *   .setpp            reply to an image (or send an image with this caption)
 *   .setname <name>   max 25 characters
 *   .setbio <text>    max 139 characters
 *   .eval <js>        OFF unless ENABLE_EVAL=true, private chat only
 */

const util = require('util');
const { downloadContentFromMessage, normalizeMessageContent, jidNormalizedUser } = require('@whiskeysockets/baileys');

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const NAME_MAX = 25;
const BIO_MAX = 139;
const DEFAULT_BIO = '⚡ KLAUS XMD — Powered by Warrior Felix';

// Never let a session ID or other long base64 blob go out in a chat message
const redact = s => String(s).replace(/[A-Za-z0-9+/_-]{200,}={0,2}/g, '[redacted]');
const notOwner = config => config?.messages?.notOwner || '❌ *Owner only command!*';

async function toBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

module.exports = [
  {
    command: 'setpp',
    description: 'Set the bot profile picture',
    category: 'owner',
    async run({ sock, msg, reply, isOwner, config }) {
      if (!isOwner) return reply(notOwner(config));

      const content = normalizeMessageContent(msg.message);
      const quoted = normalizeMessageContent(content?.extendedTextMessage?.contextInfo?.quotedMessage);
      const image = quoted?.imageMessage || content?.imageMessage;
      if (!image) {
        return reply(`🖼️ Reply to an image with *${config.prefix}setpp* (or send an image with that caption).`);
      }

      let buf;
      try {
        buf = await toBuffer(await downloadContentFromMessage(image, 'image'));
      } catch {
        return reply('⚠️ Could not download that image. It may have expired, so send it again.');
      }
      if (!buf.length) return reply('⚠️ Could not download that image. It may have expired, so send it again.');

      try {
        await sock.updateProfilePicture(jidNormalizedUser(sock.user.id), buf);
      } catch (e) {
        if (/image processing library/i.test(e.message)) {
          return reply('⚠️ The bot needs an image library for this. Run: *npm install sharp*');
        }
        return reply(`❌ Could not update the picture: ${e.message}`);
      }
      await reply(panel('🖼️ PROFILE PICTURE', [['✅ Status', '*Updated*']]));
    }
  },

  {
    command: 'setname',
    description: 'Set the bot display name',
    category: 'owner',
    async run({ sock, reply, text, isOwner, config }) {
      if (!isOwner) return reply(notOwner(config));
      if (!text) return reply(`📛 Example: ${config.prefix}setname KLAUS XMD v2`);
      if (text.length > NAME_MAX) {
        return reply(`❌ WhatsApp names can be at most ${NAME_MAX} characters (yours is ${text.length}).`);
      }
      try {
        await sock.updateProfileName(text);
      } catch (e) {
        return reply(`❌ Could not update the name: ${e.message}`);
      }
      await reply(panel('📛 DISPLAY NAME', [['✅ Status', '*Updated*'], ['📝 Name', `*${text}*`]]));
    }
  },

  {
    command: 'setbio',
    description: 'Set the bot bio',
    category: 'owner',
    async run({ sock, reply, text, isOwner, config }) {
      if (!isOwner) return reply(notOwner(config));
      const bio = text || DEFAULT_BIO;
      if (bio.length > BIO_MAX) {
        return reply(`❌ WhatsApp bios can be at most ${BIO_MAX} characters (yours is ${bio.length}).`);
      }
      try {
        await sock.updateProfileStatus(bio);
      } catch (e) {
        return reply(`❌ Could not update the bio: ${e.message}`);
      }
      await reply(panel('💬 BIO', [['✅ Status', '*Updated*'], ['📝 Bio', bio]]));
    }
  },

  {
    command: 'eval',
    description: 'Run JavaScript (owner only, off by default)',
    category: 'owner',
    async run({ sock, msg, plugins, reply, text, isOwner, isGroup, config }) {
      if (!isOwner) return reply(notOwner(config));
      if (process.env.ENABLE_EVAL !== 'true') {
        return reply(
          '🔒 *Eval is turned off.*\nIt can run any code on your server, including reading your session. ' +
            'To use it, set the environment variable *ENABLE_EVAL=true* and restart.'
        );
      }
      if (isGroup) return reply('🔒 Eval only works in a private chat.');
      if (!text) return reply(`💻 Example: ${config.prefix}eval 1 + 1`);

      const params = ['sock', 'msg', 'config', 'plugins', 'require'];
      let fn;
      try {
        fn = new AsyncFunction(...params, `return (${text}\n)`); // expressions: .eval 1 + 1
      } catch {
        try {
          fn = new AsyncFunction(...params, text); // statements: use `return` to get a value
        } catch (e) {
          return reply(`❌ *Syntax error:*\n${e.message}`);
        }
      }

      try {
        const result = await fn(sock, msg, config, plugins, require);
        const out = redact(util.inspect(result, { depth: 2 })).slice(0, 3000);
        await reply(`✅ *Result:*\n\`\`\`${out}\`\`\``);
      } catch (e) {
        await reply(`❌ *Error:*\n${redact(e.message).slice(0, 1000)}`);
      }
    }
  }
];