const axios = require('axios');

module.exports = [
  {
    command: 'quote',
    description: 'Inspirational quote',
    category: 'fun',
    async run({ reply }) {
      const { data } = await axios.get('https://zenquotes.io/api/random');
      reply(`💭 *"${data[0].q}"*\n\n— _${data[0].a}_`);
    }
  },
  {
    command: 'fact',
    description: 'Random fun fact',
    category: 'fun',
    async run({ reply }) {
      const { data } = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random');
      reply(`🧠 *Did you know?*\n\n${data.text}`);
    }
  },
  {
    command: 'advice',
    description: 'Random advice',
    category: 'fun',
    async run({ reply }) {
      const { data } = await axios.get('https://api.adviceslip.com/advice');
      reply(`💡 *Advice*\n\n${data.slip.advice}`);
    }
  },
  {
    command: 'cat',
    description: 'Random cat image',
    category: 'fun',
    async run({ sock, from }) {
      const { data } = await axios.get('https://api.thecatapi.com/v1/images/search');
      await sock.sendMessage(from, { image: { url: data[0].url }, caption: '🐱 Meow! — KLAUS XMD' });
    }
  },
  {
    command: 'dog',
    description: 'Random dog image',
    category: 'fun',
    async run({ sock, from }) {
      const { data } = await axios.get('https://dog.ceo/api/breeds/image/random');
      await sock.sendMessage(from, { image: { url: data.message }, caption: '🐶 Woof! — KLAUS XMD' });
    }
  },
  {
    command: 'roll',
    description: 'Roll a dice',
    category: 'fun',
    async run({ reply, text }) {
      const sides = parseInt(text) || 6;
      const n = Math.floor(Math.random() * sides) + 1;
      reply(`🎲 You rolled a *${n}* (d${sides})`);
    }
  },
  {
    command: 'flip',
    description: 'Flip a coin',
    category: 'fun',
    async run({ reply }) {
      reply(`🪙 *${Math.random() < 0.5 ? 'HEADS' : 'TAILS'}*`);
    }
  },
  {
    command: 'pick',
    description: 'Pick a random option',
    category: 'fun',
    async run({ reply, text }) {
      const opts = text.split(/[,|]/).map(s => s.trim()).filter(Boolean);
      if (opts.length < 2) return reply('🎯 Example: .pick pizza, burger, tacos');
      reply(`🎯 I pick: *${opts[Math.floor(Math.random() * opts.length)]}*`);
    }
  }
];