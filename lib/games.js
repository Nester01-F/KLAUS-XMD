cat > lib/games.js << 'EOF'
const games = new Map(); // key: groupId:type, value: state

const TTT_EMPTY = '⬜';
const TTT_X = '❌';
const TTT_O = '⭕';

function tttRender(board) {
  let s = '';
  for (let i = 0; i < 9; i++) {
    s += board[i];
    if (i % 3 !== 2) s += ' ';
    if (i % 3 === 2 && i !== 8) s += '\n';
  }
  return s;
}

function tttCheck(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of lines) {
    if (board[a] !== TTT_EMPTY && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.every(c => c !== TTT_EMPTY) ? 'DRAW' : null;
}

function tttCreate(groupId, p1, p2) {
  const state = {
    board: Array(9).fill(TTT_EMPTY),
    players: { [TTT_X]: p1, [TTT_O]: p2 },
    turn: TTT_X,
    startedAt: Date.now()
  };
  games.set(`ttt:${groupId}`, state);
  return state;
}

function tttPlay(groupId, player, pos) {
  const key = `ttt:${groupId}`;
  const state = games.get(key);
  if (!state) return { error: 'No active tictactoe game. Start with .ttt @user' };
  if (state.turn !== (state.players[TTT_X] === player ? TTT_X : TTT_O))
    return { error: `Not your turn! Wait for ${state.turn === TTT_X ? '❌' : '⭕'}.` };
  const symbol = state.players[TTT_X] === player ? TTT_X : TTT_O;
  if (state.players[symbol] !== player) return { error: 'Not your game.' };
  if (pos < 1 || pos > 9) return { error: 'Pick 1-9.' };
  const idx = pos - 1;
  if (state.board[idx] !== TTT_EMPTY) return { error: 'Cell taken.' };

  state.board[idx] = symbol;
  const winner = tttCheck(state.board);

  if (winner) {
    games.delete(key);
    return {
      board: tttRender(state.board),
      winner: winner === 'DRAW' ? 'DRAW' : state.players[winner]
    };
  }
  state.turn = symbol === TTT_X ? TTT_O : TTT_X;
  return { board: tttRender(state.board), turn: state.turn };
}

/* ---------- HANGMAN ---------- */
const WORDS = ['KLAUS','BOT','KENYA','WHATSAPP','JAVASCRIPT','DEVELOPER','PENGUIN','ELEPHANT','MOUNTAIN','OCEAN','TIGER','LION','PYTHON','BANANA'];
const HANG_STAGES = [
  '```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========```',
  '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========```'
];

function hangCreate(groupId) {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const state = {
    word,
    guessed: [],
    wrong: 0,
    maxWrong: 6,
    startedAt: Date.now()
  };
  games.set(`hang:${groupId}`, state);
  return { word: word.replace(/./g, '_ '), stage: HANG_STAGES[0], remaining: 6 };
}

function hangGuess(groupId, letter) {
  const key = `hang:${groupId}`;
  const state = games.get(key);
  if (!state) return { error: 'No active hangman game.' };
  letter = letter.toUpperCase();
  if (letter.length !== 1 || !/[A-Z]/.test(letter)) return { error: 'Send one letter A-Z.' };
  if (state.guessed.includes(letter)) return { error: 'Already guessed.' };

  state.guessed.push(letter);
  if (!state.word.includes(letter)) state.wrong++;

  const display = state.word.split('').map(c => state.guessed.includes(c) ? c : '_').join(' ');
  const won = state.word.split('').every(c => state.guessed.includes(c));
  const lost = state.wrong >= state.maxWrong;

  const result = {
    display,
    wrong: state.wrong,
    remaining: state.maxWrong - state.wrong,
    stage: HANG_STAGES[state.wrong],
    guessed: state.guessed.sort().join(' ')
  };

  if (won) { games.delete(key); result.won = true; result.word = state.word; }
  else if (lost) { games.delete(key); result.lost = true; result.word = state.word; }

  return result;
}

/* ---------- WORDLE ---------- */
const WORDLE_WORDS = ['APPLE','BRAVE','CRANE','DREAM','EAGLE','FLAME','GRAPE','HOUSE','IMAGE','JUICE','KNIFE','LIGHT','MONEY','NIGHT','OCEAN','PIANO','QUEEN','RIVER','SNAKE','TIGER','UNDER','VOICE','WATER','YOUTH','ZEBRA'];
const WORDLE_EMOJI = { correct: '🟩', present: '🟨', absent: '⬜' };

function wordleCreate(groupId) {
  const word = WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];
  games.set(`wordle:${groupId}`, { word, tries: [], maxTries: 6 });
  return { length: 5, maxTries: 6 };
}

function wordleGuess(groupId, guess) {
  const key = `wordle:${groupId}`;
  const state = games.get(key);
  if (!state) return { error: 'No active wordle.' };
  guess = guess.toUpperCase();
  if (guess.length !== 5) return { error: 'Guess must be 5 letters.' };
  if (!/^[A-Z]{5}$/.test(guess)) return { error: 'Letters only.' };
  if (state.tries.some(t => t.guess === guess)) return { error: 'Already tried.' };

  const row = [];
  const wordArr = state.word.split('');
  const guessArr = guess.split('');
  const used = Array(5).fill(false);

  // First pass: correct positions
  guessArr.forEach((c, i) => {
    if (c === wordArr[i]) { row[i] = WORDLE_EMOJI.correct; used[i] = true; }
  });
  // Second pass: present letters
  guessArr.forEach((c, i) => {
    if (row[i]) return;
    const idx = wordArr.findIndex((w, j) => w === c && !used[j]);
    if (idx >= 0) { row[i] = WORDLE_EMOJI.present; used[idx] = true; }
    else row[i] = WORDLE_EMOJI.absent;
  });

  state.tries.push({ guess, row: row.join('') });

  if (guess === state.word) { games.delete(key); return { won: true, word: state.word, tries: state.tries }; }
  if (state.tries.length >= state.maxTries) { games.delete(key); return { lost: true, word: state.word, tries: state.tries }; }

  return { tries: state.tries, remaining: state.maxTries - state.tries.length };
}

function getGame(groupId, type) {
  return games.get(`${type}:${groupId}`);
}
function endGame(groupId, type) {
  return games.delete(`${type}:${groupId}`);
}

module.exports = {
  tttCreate, tttPlay, tttRender,
  hangCreate, hangGuess,
  wordleCreate, wordleGuess,
  getGame, endGame
};
EOF
echo "✅ lib/games.js created"