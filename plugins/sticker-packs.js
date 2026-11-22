cat > plugins/sticker-packs.js << 'EOF'
const { addPack, getPack, listPacks, removePack } = require('../lib/database');
const { getBuffer } = require('../lib/helper');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');

async function urlToSticker(url) {
  const buf = await getBuffer(url);
  const st = new Sticker(buf, {
    pack: 'KLAUS XMD',
    author: 'KLAUS TECH',
    type: StickerTypes.FULL,
    quality: 80
  });
  return await st.toBuffer();
}

module.exports = [
  {
    command: 'addpack',
    aliases: ['newpack'],
    description: 'Create a sticker pack',
    category: 'stickers',
    async run({ reply, text, sender }) {
      if (!text) return reply('📦 Example: .addpack mypack');
      const name = text.trim().toLowerCase();
      if (getPack(name)) return reply(`❌ Pack *${name}* already exists.`);
      addPack(name, sender, []);
      reply(`✅ Sticker pack *${name}* created!\n\nAdd stickers with:\n*.addsticker ${name} <url1> <url2> ...*`);
    }
  },
  {
    command: 'addsticker',
    aliases: ['packadd'],
    description: 'Add stickers to a pack',
    category: 'stickers',
    async run({ reply, args, sender }) {
      const name = args[0]?.toLowerCase();
      const urls = args.slice(1);
      if (!name || !urls.length) return reply('📦 Example: .addsticker mypack https://url1.com/img.png');
      const pack = getPack(name);
      if (!pack) return reply(`❌ Pack *${name}* not found. Create it: .addpack ${name}`);
      addPack(name, pack.owner, urls);
      reply(`✅ Added *${urls.length}* sticker(s) to *${name}*.`);
    }
  },
  {
    command: 'packs',
    aliases: ['listpacks'],
    description: 'List sticker packs',
    category: 'stickers',
    async run({ reply }) {
      const list = listPacks();
      if (!list.length) return reply('📦 No sticker packs yet.\n\nCreate: .addpack mypack');
      const txt = list.map(n => `• *${n}* (${getPack(n).urls.length} stickers)`).join('\n');
      reply(`📦 *STICKER PACKS*\n━━━━━━━━━━━━━━━\n${txt}`);
    }
  },
  {
    command: 'sendpack',
    aliases: ['getpack'],
    description: 'Send all stickers in a pack',
    category: 'stickers',
    async run({ sock, msg, from, reply, args }) {
      const name = args[0]?.toLowerCase();
      if (!name) return reply('📦 Example: .sendpack mypack');
      const pack = getPack(name);
      if (!pack) return reply(`❌ Pack *${name}* not found.`);
      if (!pack.urls.length) return reply('📦 Pack is empty.');

      reply(`📤 Sending *${pack.urls.length}* stickers from *${name}*...`);
      for (const url of pack.urls) {
        try {
          const sticker = await urlToSticker(url);
          await sock.sendMessage(from, { sticker }, { quoted: msg });
        } catch { /* skip broken */ }
      }
    }
  },
  {
    command: 'delpack',
    aliases: ['rmpack'],
    description: 'Delete a sticker pack',
    category: 'stickers',
    owner: true,
    async run({ reply, args, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      const name = args[0]?.toLowerCase();
      if (!name) return reply('📦 Example: .delpack mypack');
      if (!getPack(name)) return reply(`❌ Pack *${name}* not found.`);
      removePack(name);
      reply(`🗑️ Pack *${name}* deleted.`);
    }
  }
];
EOF
echo "✅ plugins/sticker-packs.js created"