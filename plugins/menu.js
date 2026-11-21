module.exports = {
  command: 'menu',
  description: 'Show all commands',
  category: 'main',
  async run({ sock, from, reply, config, plugins }) {
    const cats = {};
    for (const [name, p] of plugins) {
      const c = p.category || 'other';
      (cats[c] = cats[c] || []).push(name);
    }

    let txt = `╭━━〔 *${config.botName}* 〕━━⬣\n`;
    txt += `┃ ⚡ Prefix : *${config.prefix}*\n┃ 📦 Plugins : *${plugins.size}*\n`;
    txt += `╰━━━━━━━━━━━━━━━━━━⬣\n\n`;

    for (const c in cats) {
      txt += `┏━❑ *${c.toUpperCase()}*\n`;
      cats[c].sort().forEach(cmd => txt += `┃ ▸ ${config.prefix}${cmd}\n`);
      txt += `┗━━━━━━━━━━━━⬣\n\n`;
    }
    txt += `> _KLAUS XMD • Dev: KLAUS TECH_`;

    await sock.sendMessage(from, {
      image: { url: config.images.menu },
      caption: txt
    });
  }
};