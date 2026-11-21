cat > plugins/games.js << 'EOF'
const activeGames = new Map();

module.exports = [
  {
    command: 'trivia',
    description: 'Play trivia',
    category: 'games',
    async run({ reply, from }) {
      const qs = [
        { q: 'What is the capital of Kenya?', a: 'Nairobi' },
        { q: 'How many continents are there?', a: '7' },
        { q: 'What is 15 × 4?', a: '60' },
        { q: 'Who wrote Romeo and Juliet?', a: 'Shakespeare' },
        { q: 'What planet is closest to the sun?', a: 'Mercury' }
      ];
      const pick = qs[Math.floor(Math.random() * qs.length)];
      activeGames.set(from, { type: 'trivia', answer: pick.a.toLowerCase() });
      reply(`🧠 *TRIVIA*\n\n❓ ${pick.q}\n\n💡 Reply with your answer! (30s)`);
    }
  },
  {
    command: 'guess',
    description: 'Guess the number',
    category: 'games',
    async run({ reply, from }) {
      const num = Math.floor(Math.random() * 100) + 1;
      activeGames.set(from, { type: 'guess', answer: num, tries: 0 });
      reply('🎲 *GUESS THE NUMBER*\n\nI picked a number between 1–100.\nReply with your guess!');
    }
  },
  {
    command: 'endgame',
    description: 'End active game',
    category: 'games',
    async run({ reply, from }) {
      activeGames.delete(from);
      reply('🛑 Game ended.');
    }
  }
];

module.exports.handleGameAnswer = function(from, text) {
  const game = activeGames.get(from);
  if (!game) return null;

  if (game.type === 'trivia') {
    if (text.toLowerCase().includes(game.answer)) {
      activeGames.delete(from);
      return '✅ *Correct!* +10 points 🏆';
    }
  }

  if (game.type === 'guess') {
    const n = parseInt(text);
    if (isNaN(n)) return null;
    game.tries++;
    if (n === game.answer) {
      activeGames.delete(from);
      return `🎉 *Correct!* You guessed it in *${game.tries}* tries!`;
    }
    activeGames.set(from, game);
    if (n < game.answer) return '⬆️ Higher!';
    if (n > game.answer) return '⬇️ Lower!';
  }
  return null;
};
EOF
echo "✅ plugins/games.js created"