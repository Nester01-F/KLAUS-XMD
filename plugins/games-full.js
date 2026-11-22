cat > plugins/games-full.js << 'EOF'
const {
  tttCreate, tttPlay,
  hangCreate, hangGuess,
  wordleCreate, wordleGuess,
  getGame, endGame
} = require('../lib/games');

module.exports = [
  /* ---------- TICTACTOE ---------- */
  {
    command: 'ttt',
    aliases: ['tictactoe'],
    description: 'Play tictactoe vs someone',
    category: 'games',
    async run({ sock, msg, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      const opp = msg.message.extendedTextMessage?.contextInfo?.participant;
      if (!opp) return reply('🎮 Example: .ttt @opponent');
      if (opp === msg.key.participant) return reply('❌ You cant play yourself.');
      if (getGame(from, 'ttt')) return reply('🎮 Game already running. End with .endgame ttt');

      const me = msg.key.participant;
      const state = tttCreate(from, me, opp);
      await sock.sendMessage(from, {
        text: `🎮 *TICTACTOE*\n\n❌ @${me.split('@')[0]}\n⭕ @${opp.split('@')[0]}\n\nBoard (1-9):\n1️⃣2️⃣3️⃣\n4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣\n\n${state.board ? '' : 'Board:'}\n❌ goes first!\n\nPlay: *.tttplay 5*`,
        mentions: [me, opp]
      }, { quoted: msg });
    }
  },
  {
    command: 'tttplay',
    description: 'Play a move in tictactoe',
    category: 'games',
    async run({ msg, from, reply, args }) {
      const pos = parseInt(args[0]);
      if (!pos) return reply('🎮 Example: .tttplay 5');
      const me = msg.key.participant;
      const r = tttPlay(from, me, pos);
      if (r.error) return reply(`❌ ${r.error}`);
      if (r.winner) {
        if (r.winner === 'DRAW') return reply(`🤝 *DRAW!*\n\n${r.board}`);
        return reply(`🏆 *WINNER: @${r.winner.split('@')[0]}*\n\n${r.board}`, { mentions: [r.winner] });
      }
      await reply(`${r.board}\n\n▶️ Turn: ${r.turn === '❌' ? '❌' : '⭕'}\nPlay: .tttplay N`);
    }
  },

  /* ---------- HANGMAN ---------- */
  {
    command: 'hangman',
    aliases: ['hang'],
    description: 'Play hangman',
    category: 'games',
    async run({ sock, from, reply, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      if (getGame(from, 'hang')) return reply('🎮 Hangman already running. .endgame hang');
      const s = hangCreate(from);
      await sock.sendMessage(from, {
        text: `🎯 *HANGMAN*\n\n${s.stage}\n\nWord: \`${s.word}\`\n❤️ Remaining: *${s.remaining}*\n\nGuess with: *.guess A*`
      });
    }
  },
  {
    command: 'guess',
    description: 'Guess a letter in hangman',
    category: 'games',
    async run({ sock, from, reply, args }) {
      const letter = args[0];
      if (!letter) return reply('🔤 Example: .guess A');
      const r = hangGuess(from, letter);
      if (r.error) return reply(`❌ ${r.error}`);

      if (r.won) return sock.sendMessage(from, {
        text: `🎉 *YOU WON!*\n\nWord was: *${r.word}*\n\n${r.stage}`
      });
      if (r.lost) return sock.sendMessage(from, {
        text: `💀 *GAME OVER*\n\nWord was: *${r.word}*\n\n${r.stage}`
      });

      await sock.sendMessage(from, {
        text: `${r.stage}\n\nWord: \`${r.display}\`\n❤️ Remaining: *${r.remaining}*\n📝 Guessed: ${r.guessed}`
      });
    }
  },

  /* ---------- WORDLE ---------- */
  {
    command: 'wordle',
    description: 'Start a wordle game',
    category: 'games',
    async run({ reply, from, isGroup }) {
      if (!isGroup) return reply('👥 Group only.');
      if (getGame(from, 'wordle')) return reply('🎮 Wordle already running. .endgame wordle');
      const s = wordleCreate(from);
      reply(`🟩 *WORDLE*\n\nGuess a 5-letter word.\nYou have ${s.maxTries} tries.\n\nPlay: *.wordleplay CRANE*`);
    }
  },
  {
    command: 'wordleplay',
    description: 'Guess a word in wordle',
    category: 'games',
    async run({ reply, from, args }) {
      const guess = args[0];
      if (!guess) return reply('🟩 Example: .wordleplay CRANE');
      const r = wordleGuess(from, guess);
      if (r.error) return reply(`❌ ${r.error}`);

      const board = r.tries.map((t, i) =>
        `${i + 1}. ${t.guess}\n   ${t.row}`
      ).join('\n');

      if (r.won) return reply(`🎉 *SOLVED!*\n\n${board}\n\nWord: *${r.word}*`);
      if (r.lost) return reply(`💀 *GAME OVER*\n\n${board}\n\nWord was: *${r.word}*`);
      reply(`🟩 *WORDLE*\n\n${board}\n\n🎯 Remaining tries: *${r.remaining}*`);
    }
  },

  /* ---------- END GAME ---------- */
  {
    command: 'endgame',
    aliases: ['end'],
    description: 'End active game',
    category: 'games',
    async run({ reply, from, args }) {
      const type = args[0]?.toLowerCase();
      if (!['ttt', 'hang', 'wordle', 'all'].includes(type))
        return reply('🛑 Usage: .endgame ttt | hang | wordle | all');
      if (type === 'all') {
        ['ttt', 'hang', 'wordle'].forEach(t => endGame(from, t));
        return reply('🛑 All games ended.');
      }
      endGame(from, type);
      reply(`🛑 ${type} game ended.`);
    }
  }
];
