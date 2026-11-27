const { getGroup, setGroup, getUser, setUser, getDB, getBot, setBot } = require('../lib/database');
const fs = require('fs');
const path = require('path');

const TOGGLE_FEATURES = ['antilink', 'antispam', 'antibot', 'antidelete', 'antitag', 'welcome', 'goodbye'];

/* Helper: check if sender is admin or owner */
async function isAdmin(sock, from, sender, config) {
  const ownerNum = String(sender).split('@')[0].split(':')[0].replace(/\D/g, '');
  if (config.owner?.map(n => String(n).replace(/\D/g, '')).includes(ownerNum)) return true;
  try {
    const meta = await sock.groupMetadata(from);
    const p = meta.participants.find(x => x.id === sender);
    return !!p?.admin;
  } catch { return false; }
}

module.exports = [
  /* ═══════════════════════════════════════════════════════════
     VIEW SETTINGS
     ═══════════════════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════════════════
     TOGGLE
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'toggle',
    aliases: ['tog'],
    description: 'Toggle a setting',
    category: 'settings',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender, config }) {
      const feature = args[0]?.toLowerCase();
      if (!feature || !TOGGLE_FEATURES.includes(feature)) {
        return reply(`⚙️ *Toggle Features*\n━━━━━━━━━━━━━━━\n${TOGGLE_FEATURES.map(f => `• .toggle ${f}`).join('\n')}`);
      }
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');

      const g = getGroup(from);
      const newVal = !g[feature];
      setGroup(from, { [feature]: newVal });
      reply(`✅ *${feature}* is now *${newVal ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  },

  /* ═══════════════════════════════════════════════════════════
     QUICK TOGGLE SHORTCUTS
     ═══════════════════════════════════════════════════════════ */
  ...['antilink', 'antispam', 'antibot', 'antidelete', 'antitag'].map(feat => ({
    command: feat,
    description: `Quick toggle ${feat}`,
    category: 'settings',
    admin: true,
    async run({ sock, from, reply, args, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');
      const mode = args[0]?.toLowerCase();
      const g = getGroup(from);
      const newVal = mode === 'on' ? true : mode === 'off' ? false : !g[feat];
      setGroup(from, { [feat]: newVal });
      reply(`✅ *${feat}* is now *${newVal ? 'ENABLED ✅' : 'DISABLED ❌'}*`);
    }
  })),

  /* ═══════════════════════════════════════════════════════════
     SET PREFIX
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'setprefix',
    aliases: ['prefix'],
    description: 'Change command prefix (owner only)',
    category: 'settings',
    owner: true,
    async run({ reply, args, config, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      const newPrefix = args[0];
      if (!newPrefix) return reply(`⚙️ Current prefix: \`${config.prefix}\`\n\nUsage: .setprefix !\nMax 3 characters.`);
      if (newPrefix.length > 3) return reply('❌ Prefix must be 1-3 characters.');

      config.prefix = newPrefix;
      // Update config file
      try {
        const cfgPath = path.join(__dirname, '..', 'config.js');
        let content = fs.readFileSync(cfgPath, 'utf8');
        content = content.replace(/prefix:\s*['"`][^'"`]*['"`]/, `prefix: '${newPrefix}'`);
        fs.writeFileSync(cfgPath, content);
        reply(`✅ *Prefix updated* → \`${newPrefix}\`\n\n_Restart recommended for full effect._`);
      } catch (e) {
        reply(`✅ Prefix set to \`${newPrefix}\` (in memory only — config file not writable)`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     SET BOT NAME
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'setname',
    description: 'Set bot display name (owner only)',
    category: 'settings',
    owner: true,
    async run({ sock, reply, text, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      if (!text) return reply('📛 Example: .setname KLAUS XMD v2');
      try {
        await sock.updateProfileName(text);
        reply(`✅ Bot name updated to *${text}*`);
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     SET BOT BIO
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'setbio',
    aliases: ['setstatus'],
    description: 'Set bot bio (owner only)',
    category: 'settings',
    owner: true,
    async run({ sock, reply, text, isOwner, config }) {
      if (!isOwner) return reply('❌ Owner only.');
      const bio = text || `⚡ ${config.botName} — Powered by KLAUS TECH`;
      try {
        await sock.updateProfileStatus(bio);
        reply(`✅ Bio updated to:\n_${bio}_`);
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     SET USER/GROUP VALUES
     ═══════════════════════════════════════════════════════════ */
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
        return reply('✅ Welcome message updated.\n💡 Use `@user` and `@group` as placeholders.');
      }
      if (key === 'goodbye' && isGroup) {
        setGroup(from, { goodbyeMsg: value });
        return reply('✅ Goodbye message updated.');
      }
      reply('❌ Unknown setting. Try: name, welcome, goodbye');
    }
  },

  /* ═══════════════════════════════════════════════════════════
     GET SETTING
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'get',
    description: 'Get a setting value',
    category: 'settings',
    async run({ reply, args, from, isGroup, sender }) {
      const key = args[0]?.toLowerCase();
      if (!key) return reply('⚙️ Example: .get name');

      if (key === 'name') {
        const u = getUser(sender);
        return reply(`⚙️ *Your name:* ${u.name || '_not set_'}`);
      }
      if (isGroup && ['welcome', 'goodbye'].includes(key)) {
        const g = getGroup(from);
        const val = key === 'welcome' ? g.welcomeMsg : g.goodbyeMsg;
        return reply(`⚙️ *Group ${key}:* ${val || '_default_'}`);
      }
      reply(`⚙️ *${key}* = (not found)`);
    }
  },

  /* ═══════════════════════════════════════════════════════════
     RESET GROUP SETTINGS
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'reset',
    description: 'Reset group settings to defaults',
    category: 'settings',
    admin: true,
    async run({ sock, from, reply, isGroup, sender, config }) {
      if (!isGroup) return reply('👥 Group only.');
      if (!(await isAdmin(sock, from, sender, config))) return reply('❌ Admin only.');
      setGroup(from, {
        antilink: false, antispam: false, antibot: false,
        antidelete: false, antitag: false,
        welcome: true, goodbye: true,
        welcomeMsg: '', goodbyeMsg: ''
      });
      reply('✅ Group settings reset to defaults.');
    }
  },

  /* ═══════════════════════════════════════════════════════════
     BACKUP SETTINGS (export JSON)
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'backup',
    aliases: ['export'],
    description: 'Export all settings as JSON',
    category: 'settings',
    owner: true,
    async run({ sock, msg, from, reply, isOwner }) {
      if (!isOwner) return reply('❌ Owner only.');
      try {
        const db = getDB();
        const backup = {
          exportedAt: new Date().toISOString(),
          bot: db.bot,
          groups: db.groups,
          users: db.users,
          stats: db.stats
        };
        const json = JSON.stringify(backup, null, 2);
        const buf = Buffer.from(json, 'utf8');

        await sock.sendMessage(from, {
          document: buf,
          mimetype: 'application/json',
          fileName: `klaus-backup-${Date.now()}.json`,
          caption: '💾 *Settings Backup*\n\nKeep this file safe!'
        }, { quoted: msg });
      } catch (e) {
        reply(`❌ Backup failed: ${e.message}`);
      }
    }
  }
];