module.exports = {
  botName: 'KLAUS XMD',
  owner: (process.env.OWNER_NUMBER || '254701881604').split(','), // number(s) without +
  prefix: process.env.PREFIX || '.',
  sessionName: 'session',
  timezone: 'Africa/Nairobi',

  // 🔐 SESSION ID
  // Paste your SESSION_ID between the quotes below, OR set a SESSION_ID
  // environment variable on your host (the environment variable wins).
  // ⚠️ Never push a real session ID to GitHub: anyone who has it controls your WhatsApp.
  sessionId: process.env.SESSION_ID || '',

  // 🖼️ Images (as requested)
  images: {
    banner:    'https://files.catbox.moe/t01dvk.jpg',      // README / repo
    alive:     'https://files.catbox.moe/maj8xu.jpg',  // ALIVE + avatar
    menu:      'https://files.catbox.moe/lusgnl.jpg',  // MENU header
    commands:  'https://files.catbox.moe/0tcgcw.jpg',  // COMMANDS list
    dev:       'https://files.catbox.moe/ndm2q0.jpg'   // DEV / owner card
  },

  // Feature toggles
  features: {
    antiLink: true,
    antiSpam: true,
    autoRead: false,
    autoTyping: true
  },

  messages: {
    notOwner:   '❌ *Owner only command!*',
    notAdmin:   '❌ *Admin only command!*',
    notGroup:   '❌ *This command works in groups only!*',
    cooldown:   '⏳ *Please wait, command on cooldown...*',
    error:      '💥 *Something went wrong, try again.*'
  }
};