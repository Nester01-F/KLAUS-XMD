const { getGroup, setGroup, getUser, setUser, getDB } = require('../lib/database');

module.exports = [
  {
    command: 'settings',
    aliases: ['config'],
    description: 'View all settings',
    category: 'settings',
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) {
        const u = getUser(from);
        return reply(
`⚙️ *YOUR SETTINGS*
━━━━━━━━━━━━━━━
👤 Name       : *${u.name || 'not set'}*
🌐 Language   : *${u.settings.language}*
🔔 Notifications: *${u.settings.notifications ? 'ON' : 'OFF'}*
😴 AFK        : *${u.afk ? 'since ' + new Date(u.afk).toLocaleString() : 'off'}*
⚠️ Warnings   : *${u.warnings || 0}*`
        );
      }
      const g = getGroup(from);
      reply(
`⚙️ *GROUP SETTINGS*
━━━━━━━━━━━━━━━
🔗 Antilink  : *${g.antilink ? 'ON ✅' : 'OFF ❌'}*
🚫 Antispam  : *${g.antispam ? 'ON ✅' : 'OFF ❌'}*
🤖 Antibot   : *${g.antibot ? 'ON ✅' : 'OFF ❌'}*
🗑️ Antidelete: *${g.antidelete ? 'ON ✅' : 'OFF ❌'}*
🏷️ Antitag   : *${g.antitag ? 'ON ✅' : 'OFF ❌'}*
👋 Welcome   : *${g.welcome ? 'ON ✅' : 'OFF ❌'}*
👋 Goodbye   : *${g.goodbye ? 'ON ✅' : 'OFF ❌'}*
🔞 NSFW      : *${g.settings.nsfw ? 'ON ✅' : 'OFF ❌'}*

💡 Use *.toggle <feature>* to change`
      );
    }
  },
  {
    command: 'toggle',
    aliases: ['tog'],
    description: 'Toggle a setting',
    category: 'settings',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender, config }) {
      const feature = args[0]?.toLowerCase();
      const valid = ['antilink','antispam','antibot','antidelete','antitag','welcome','goodbye'];

      if (!feature || !valid.includes(feature)) {
        return reply(`⚙️ *Toggle Features*\n━━━━━━━━━━━━━━━\n${valid.map(f => `• .toggle ${f}`).join('\n')}`);
      }

      if (!isGroup) return reply('👥 Group only.');

      // Admin check
      const meta = await sock.groupMetadata(from);
      const p = meta.participants.find(x => x.id === sender);
      const isAdm = p?.admin || config.owner.includes(sender.split('@')[0]);
      if (!isAdm) return reply('❌ Admin only.');

      const g = getGroup(from);
      const newVal = !g[feature];
      setGroup(from, { [feature]: newVal });
      reply(`✅ *${feature}* is now *${newVal ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  },
  {
    command: 'set',
    description: 'Set a value',
    category: 'settings',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender, config }) {
      const key = args[0]?.toLowerCase();
      const value = args.slice(1).join(' ');

      if (!key || !value) return reply('⚙️ Example: .set name MyBot');

      if (key === 'name') {
        setUser(sender, { name: value });
        return reply(`✅ Your name set to *${value}*`);
      }
      if (key === 'welcome' && isGroup) {
        setGroup(from, { welcomeMsg: value });
        return reply('✅ Welcome message updated.');
      }
      if (key === 'goodbye' && isGroup) {
        setGroup(from, { goodbyeMsg: value });
        return reply('✅ Goodbye message updated.');
      }
      reply('❌ Unknown setting. Try: name, welcome, goodbye');
    }
  },
  {
    command: 'get',
    description: 'Get a setting value',
    category: 'settings',
    async run({ reply, args }) {
      const key = args[0]?.toLowerCase();
      if (!key) return reply('⚙️ Example: .get name');
      reply(`⚙️ *${key}* = (fetching...)`);
    }
  },
  {
    command: 'reset',
    description: 'Reset user/group settings',
    category: 'settings',
    admin: true,
    async run({ reply, args, from, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const { setGroup } = require('../lib/database');
      setGroup(from, { antilink: false, antispam: false, antibot: false, antidelete: false, antitag: false });
      reply('✅ Group settings reset to defaults.');
    }
  }
];
