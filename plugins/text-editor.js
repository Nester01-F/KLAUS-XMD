cat > plugins/text-editor.js << 'EOF'
module.exports = [
  /* ---------- FONT STYLES ---------- */
  {
    command: 'bold',
    aliases: ['b'],
    description: 'Bold text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .bold hello');
      reply(`*${text}*`);
    }
  },
  {
    command: 'italic',
    aliases: ['i'],
    description: 'Italic text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .italic hello');
      reply(`_${text}_`);
    }
  },
  {
    command: 'strike',
    aliases: ['s'],
    description: 'Strikethrough text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .strike hello');
      reply(`~${text}~`);
    }
  },
  {
    command: 'mono',
    aliases: ['code'],
    description: 'Monospace text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .mono hello');
      reply(`\`\`\`${text}\`\`\``);
    }
  },

  /* ---------- UNICODE FONTS ---------- */
  {
    command: 'fancy',
    aliases: ['style'],
    description: 'Convert to fancy Unicode',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✨ Example: .fancy hello');
      const map = {
        a:'𝐚',b:'𝐛',c:'𝐜',d:'𝐝',e:'𝐞',f:'𝐟',g:'𝐠',h:'𝐡',i:'𝐢',j:'𝐣',
        k:'𝐤',l:'𝐥',m:'𝐦',n:'𝐧',o:'𝐨',p:'𝐩',q:'𝐪',r:'𝐫',s:'𝐬',t:'𝐭',
        u:'𝐮',v:'𝐯',w:'𝐰',x:'𝐱',y:'𝐲',z:'𝐳',
        A:'𝐀',B:'𝐁',C:'𝐂',D:'𝐃',E:'𝐄',F:'𝐅',G:'𝐆',H:'𝐇',I:'𝐈',J:'𝐉',
        K:'𝐊',L:'𝐋',M:'𝐌',N:'𝐍',O:'𝐎',P:'𝐏',Q:'𝐐',R:'𝐑',S:'𝐒',T:'𝐓',
        U:'𝐔',V:'𝐕',W:'𝐖',X:'𝐗',Y:'𝐘',Z:'𝐙'
      };
      reply(text.split('').map(c => map[c] || c).join(''));
    }
  },
  {
    command: 'smallcaps',
    aliases: ['sc'],
    description: 'Small caps text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .smallcaps hello');
      const map = {
        a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',
        k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'Q',r:'ʀ',s:'ꜱ',t:'ᴛ',
        u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'
      };
      reply(text.toLowerCase().split('').map(c => map[c] || c).join(''));
    }
  },
  {
    command: 'bubble',
    description: 'Bubble text style',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .bubble hello');
      const map = {
        a:'ⓐ',b:'ⓑ',c:'ⓒ',d:'ⓓ',e:'ⓔ',f:'ⓕ',g:'ⓖ',h:'ⓗ',i:'ⓘ',j:'ⓙ',
        k:'ⓚ',l:'ⓛ',m:'ⓜ',n:'ⓝ',o:'ⓞ',p:'ⓟ',q:'ⓠ',r:'ⓡ',s:'ⓢ',t:'ⓣ',
        u:'ⓤ',v:'ⓥ',w:'ⓦ',x:'ⓧ',y:'ⓨ',z:'ⓩ',
        A:'Ⓐ',B:'Ⓑ',C:'Ⓒ',D:'Ⓓ',E:'Ⓔ',F:'Ⓕ',G:'Ⓖ',H:'Ⓗ',I:'Ⓘ',J:'Ⓙ',
        K:'Ⓚ',L:'Ⓛ',M:'Ⓜ',N:'Ⓝ',O:'Ⓞ',P:'Ⓟ',Q:'Ⓠ',R:'Ⓡ',S:'Ⓢ',T:'Ⓣ',
        U:'Ⓤ',V:'Ⓥ',W:'Ⓦ',X:'Ⓧ',Y:'Ⓨ',Z:'Ⓩ'
      };
      reply(text.split('').map(c => map[c] || c).join(''));
    }
  },
  {
    command: 'reverse',
    aliases: ['rev'],
    description: 'Reverse text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .reverse hello');
      reply(text.split('').reverse().join(''));
    }
  },
  {
    command: 'mock',
    description: 'Mocking text (aLtErNaTiNg)',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .mock hello');
      const out = text.split('').map((c, i) =>
        i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()
      ).join('');
      reply(out);
    }
  },
  {
    command: 'upper',
    description: 'UPPERCASE text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .upper hello');
      reply(text.toUpperCase());
    }
  },
  {
    command: 'lower',
    description: 'lowercase text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .lower HELLO');
      reply(text.toLowerCase());
    }
  },
  {
    command: 'capitalize',
    aliases: ['cap'],
    description: 'Capitalize Each Word',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .capitalize hello world');
      reply(text.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()));
    }
  },
  {
    command: 'swap',
    description: 'sWAP cASE',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('✍️ Example: .swap HeLLo');
      reply(text.split('').map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(''));
    }
  },

  /* ---------- ENCODERS ---------- */
  {
    command: 'binary',
    aliases: ['bin'],
    description: 'Convert text to binary',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('🔢 Example: .binary hello');
      reply(text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' '));
    }
  },
  {
    command: 'unbinary',
    aliases: ['unbin'],
    description: 'Binary to text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('🔢 Example: .unbinary 01101000 01100101');
      try {
        reply(text.split(/\s+/).map(b => String.fromCharCode(parseInt(b, 2))).join(''));
      } catch { reply('❌ Invalid binary.'); }
    }
  },
  {
    command: 'morse',
    description: 'Text to Morse code',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('📡 Example: .morse sos');
      const map = { a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..', ' ': '/' };
      reply(text.toLowerCase().split('').map(c => map[c] || c).join(' '));
    }
  },
  {
    command: 'unmorse',
    description: 'Morse to text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('📡 Example: .unmorse ... --- ...');
      const map = { '.-': 'a', '-...': 'b', '-.-.': 'c', '-..': 'd', '.': 'e', '..-.': 'f', '--.': 'g', '....': 'h', '..': 'i', '.---': 'j', '-.-': 'k', '.-..': 'l', '--': 'm', '-.': 'n', '---': 'o', '.--.': 'p', '--.-': 'q', '.-.': 'r', '...': 's', '-': 't', '..-': 'u', '...-': 'v', '.--': 'w', '-..-': 'x', '-.--': 'y', '--..': 'z', '/': ' ' };
      reply(text.split(/\s+/).map(c => map[c] || '?').join(''));
    }
  },
  {
    command: 'rot13',
    description: 'ROT13 cipher',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('🔐 Example: .rot13 hello');
      reply(text.replace(/[a-zA-Z]/g, c => {
        const base = c <= 'Z' ? 65 : 97;
        return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
      }));
    }
  },
  {
    command: 'hex',
    description: 'Text to hex',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('🔢 Example: .hex hello');
      reply(text.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' '));
    }
  },
  {
    command: 'unhex',
    description: 'Hex to text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('🔢 Example: .unhex 68 65 6c 6c 6f');
      try {
        reply(text.split(/\s+/).map(h => String.fromCharCode(parseInt(h, 16))).join(''));
      } catch { reply('❌ Invalid hex.'); }
    }
  },
  {
    command: 'ascii',
    description: 'Text to ASCII codes',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('🔢 Example: .ascii hello');
      reply(text.split('').map(c => c.charCodeAt(0)).join(' '));
    }
  },
  {
    command: 'unascii',
    description: 'ASCII to text',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('🔢 Example: .unascii 104 101 108 108 111');
      try {
        reply(text.split(/\s+/).map(n => String.fromCharCode(parseInt(n))).join(''));
      } catch { reply('❌ Invalid ASCII.'); }
    }
  },

  /* ---------- UTILS ---------- */
  {
    command: 'count',
    aliases: ['wordcount', 'wc'],
    description: 'Count words/chars',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('📊 Example: .count hello world');
      const chars = text.length;
      const words = text.trim().split(/\s+/).length;
      const lines = text.split('\n').length;
      reply(`📊 *TEXT STATS*\n\n🔤 Characters: *${chars}*\n📝 Words: *${words}*\n📄 Lines: *${lines}*`);
    }
  },
  {
    command: 'spoil',
    aliases: ['spoiler'],
    description: 'Hide text as spoiler',
    category: 'text',
    async run({ reply, text }) {
      if (!text) return reply('🫣 Example: .spoil secret');
      reply(`||${text}||`);
    }
  },
  {
    command: 'repeat',
    description: 'Repeat text N times',
    category: 'text',
    async run({ reply, text, args }) {
      const n = parseInt(args[0]);
      const msg = args.slice(1).join(' ');
      if (!n || !msg) return reply('🔁 Example: .repeat 3 hello');
      if (n > 20) return reply('❌ Max 20 repeats.');
      reply(Array(n).fill(msg).join('\n'));
    }
  }
];
