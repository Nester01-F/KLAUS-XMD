module.exports = {
  botName: 'KLAUS XMD',
  owner: ['254700000000'], // 👈 your number(s) without +
  prefix: '.',
  sessionName: 'session',
  timezone: 'Africa/Nairobi',

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