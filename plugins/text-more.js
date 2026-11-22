module.exports = [
  {
    command: 'camel',
    description: 'Convert to camelCase',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .camel hello world');
      const out = text.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase());
      reply(`🐫 \`${out}\``);
    }
  },
  {
    command: 'snake',
    description: 'Convert to snake_case',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .snake Hello World');
      const out = text.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      reply(`🐍 \`${out}\``);
    }
  },
  {
    command: 'kebab',
    description: 'Convert to kebab-case',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .kebab Hello World');
      const out = text.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      reply(`🍢 \`${out}\``);
    }
  },
  {
    command: 'pascal',
    description: 'Convert to PascalCase',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .pascal hello world');
      const out = text.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase())
        .replace(/^./, c => c.toUpperCase());
      reply(`🔠 \`${out}\``);
    }
  },
  {
    command: 'leet',
    aliases: ['1337'],
    description: 'Convert to leetspeak',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .leet hello');
      const map = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7', b: '8', g: '9' };
      reply(`💻 ${text.toLowerCase().split('').map(c => map[c] || c).join('')}`);
    }
  },
  {
    command: 'clap',
    description: 'Add clap emoji between words',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('👏 Example: .clap hello world');
      reply(text.split(/\s+/).join(' 👏 '));
    }
  },
  {
    command: 'stutter',
    description: 'Stutter text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .stutter hello');
      reply(text.split('').map(c => c + c + c).join(''));
    }
  },
  {
    command: 'spongebob',
    aliases: ['sbob'],
    description: 'sPoNgEbOb text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('🧽 Example: .spongebob hello');
      const out = text.split('').map((c, i) =>
        i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
      ).join('');
      reply(`🧽 ${out}`);
    }
  }
];