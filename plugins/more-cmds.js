/**
 * KLAUS XMD: more commands (no API keys needed)
 * Save as plugins/more-cmds.js
 *
 * FUN     : fox, duck, catfact, dadjoke, affirm, xkcd
 * GAMES   : rps, slots
 * SEARCH  : book, songinfo, holidays, quake, stackoverflow, pypi, apod
 * TOOLS   : synonym, antonym, rhyme, color, convert, age, bmi, zodiac, hash, dns
 *
 * Optional env var: NASA_API_KEY (for .apod; falls back to NASA's shared DEMO_KEY)
 */

const crypto = require('crypto');
const dnsp = require('dns').promises;

const TIMEOUT = 12000;

/* ---------- helpers ---------- */
async function getJSON(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'KLAUS-XMD/1.0', Accept: 'application/json' }
    });
    if (!res.ok) {
      const err = new Error('HTTP ' + res.status);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const box = (title, lines) =>
  `┏━❑ ${title}\n` +
  lines.filter(Boolean).map(l => `┃ ${l}`).join('\n') +
  '\n┗━━━━━━━━━━━━⬣';

const trim = (s, n) => {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};
const num = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const enc = encodeURIComponent;
const pad2 = n => String(n).padStart(2, '0');
const utc = ms => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
};
const decodeEntities = s =>
  String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function failMessage(e, what) {
  if (e.status === 404 || e.status === 400) return `❌ ${what} not found.`;
  if (e.status === 429 || e.status === 403) return '⏳ The service is rate-limiting requests. Try again in a minute.';
  if (e.name === 'AbortError') return '⌛ The service took too long to answer. Try again.';
  return '💥 Could not reach the service. Try again later.';
}

const wrap = (what, fn) => async ctx => {
  try {
    await fn(ctx);
  } catch (e) {
    ctx.logger?.error(`${ctx.cmd}: ${e.message}`);
    await ctx.reply(failMessage(e, what));
  }
};

// Sends an image with a caption; long captions go as a separate text message
async function sendCard(ctx, imageUrl, caption) {
  const { sock, from, msg, reply } = ctx;
  if (imageUrl) {
    try {
      const short = caption.length <= 1000;
      await sock.sendMessage(
        from,
        short ? { image: { url: imageUrl }, caption } : { image: { url: imageUrl } },
        { quoted: msg }
      );
      return short ? undefined : reply(caption);
    } catch {
      return reply(`${caption}\n\n${imageUrl}`);
    }
  }
  return reply(caption);
}

/* ---------- data for built-in tools ---------- */
const UNIT_GROUPS = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, nmi: 1852 },
  mass: { kg: 1, g: 0.001, mg: 1e-6, lb: 0.45359237, oz: 0.028349523125, t: 1000, st: 6.35029318 },
  volume: { l: 1, ml: 0.001, gal: 3.785411784, qt: 0.946352946, pt: 0.473176473, cup: 0.2365882365, floz: 0.0295735295625, tbsp: 0.01478676478125, tsp: 0.00492892159375 },
  speed: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, kn: 1852 / 3600 },
  data: { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 },
  area: { m2: 1, km2: 1e6, ha: 10000, acre: 4046.8564224, ft2: 0.09290304, mi2: 2589988.110336 },
  time: { s: 1, min: 60, h: 3600, d: 86400, wk: 604800 }
};
const TEMP = {
  to: { c: v => v, f: v => ((v - 32) * 5) / 9, k: v => v - 273.15 },
  from: { c: v => v, f: v => (v * 9) / 5 + 32, k: v => v + 273.15 }
};
const UNIT_ALIASES = {
  meter: 'm', meters: 'm', metre: 'm', metres: 'm', kilometer: 'km', kilometers: 'km', kilometre: 'km',
  kilometres: 'km', mile: 'mi', miles: 'mi', foot: 'ft', feet: 'ft', inch: 'in', inches: 'in',
  yard: 'yd', yards: 'yd', pound: 'lb', pounds: 'lb', lbs: 'lb', ounce: 'oz', ounces: 'oz',
  kilogram: 'kg', kilograms: 'kg', kgs: 'kg', gram: 'g', grams: 'g', liter: 'l', liters: 'l',
  litre: 'l', litres: 'l', gallon: 'gal', gallons: 'gal', celsius: 'c', fahrenheit: 'f', kelvin: 'k',
  kmh: 'km/h', kph: 'km/h', ms: 'm/s', knot: 'kn', knots: 'kn', hour: 'h', hours: 'h', hr: 'h',
  minute: 'min', minutes: 'min', second: 's', seconds: 's', sec: 's', day: 'd', days: 'd', week: 'wk',
  weeks: 'wk', byte: 'b', bytes: 'b', kib: 'kb', mib: 'mb', gib: 'gb', tib: 'tb', hectare: 'ha',
  acres: 'acre', sqm: 'm2', sqft: 'ft2', sqkm: 'km2'
};
const normUnit = u => {
  const x = String(u || '').toLowerCase().replace('°', '');
  return UNIT_ALIASES[x] || x;
};
const fmtNum = n => Number(Number(n).toPrecision(8)).toLocaleString('en-US', { maximumFractionDigits: 8 });

const SIGNS = [
  [1, 20, 'Aquarius', '♒', 'Air'], [2, 19, 'Pisces', '♓', 'Water'], [3, 21, 'Aries', '♈', 'Fire'],
  [4, 20, 'Taurus', '♉', 'Earth'], [5, 21, 'Gemini', '♊', 'Air'], [6, 21, 'Cancer', '♋', 'Water'],
  [7, 23, 'Leo', '♌', 'Fire'], [8, 23, 'Virgo', '♍', 'Earth'], [9, 23, 'Libra', '♎', 'Air'],
  [10, 23, 'Scorpio', '♏', 'Water'], [11, 22, 'Sagittarius', '♐', 'Fire'], [12, 22, 'Capricorn', '♑', 'Earth']
];
function signFor(month, day) {
  let found = SIGNS[SIGNS.length - 1]; // Capricorn covers Dec 22 to Jan 19
  for (const s of SIGNS) if (month > s[0] || (month === s[0] && day >= s[1])) found = s;
  return found;
}
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const daysIn = (m, y = 2024) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function parseFullDate(text) {
  let m;
  let y, mo, d;
  if ((m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) [y, mo, d] = [+m[1], +m[2], +m[3]];
  else if ((m = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) [y, mo, d] = [+m[3], +m[2], +m[1]];
  else return null;
  if (mo < 1 || mo > 12 || d < 1 || d > daysIn(mo, y)) return null;
  return [y, mo, d];
}

const RPS = {
  rock: { icon: '✊', beats: 'scissors' },
  paper: { icon: '✋', beats: 'rock' },
  scissors: { icon: '✌️', beats: 'paper' }
};
const RPS_ALIAS = { r: 'rock', rock: 'rock', p: 'paper', paper: 'paper', s: 'scissors', scissors: 'scissors' };
const REEL = ['🍒', '🍋', '🍇', '🔔', '⭐', '7️⃣', '💎'];

// Factory for the three Datamuse word commands
const wordCmd = (command, rel, label, emoji) => ({
  command,
  category: 'tools',
  description: `${label} for a word`,
  usage: `.${command} happy`,
  run: wrap('Word', async ({ args, reply }) => {
    const w = args[0];
    if (!w) return reply(`Usage: .${command} happy`);
    const list = await getJSON(`https://api.datamuse.com/words?${rel}=${enc(w)}&max=15`);
    if (!list.length) return reply(`❌ No ${label.toLowerCase()} found for "${w}".`);
    await reply(box(`${emoji} ${label.toUpperCase()}: ${w}`, [list.map(x => x.word).join(', ')]));
  })
});

/* ---------- commands ---------- */
module.exports = [
  /* ===== FUN ===== */
  {
    command: 'fox', category: 'fun', description: 'Random fox picture', usage: '.fox',
    run: wrap('Fox', async ctx => {
      const d = await getJSON('https://randomfox.ca/floof/');
      await sendCard(ctx, d.image, '🦊 Here is your fox!');
    })
  },
  {
    command: 'duck', category: 'fun', description: 'Random duck picture', usage: '.duck',
    run: wrap('Duck', async ctx => {
      const d = await getJSON('https://random-d.uk/api/v2/random');
      await sendCard(ctx, d.url, '🦆 Quack! Here is your duck.');
    })
  },
  {
    command: 'catfact', category: 'fun', description: 'Random cat fact', usage: '.catfact',
    run: wrap('Fact', async ({ reply }) => {
      const d = await getJSON('https://catfact.ninja/fact');
      await reply(box('🐱 CAT FACT', [d.fact]));
    })
  },
  {
    command: 'dadjoke', category: 'fun', description: 'Random dad joke', usage: '.dadjoke',
    run: wrap('Joke', async ({ reply }) => {
      const d = await getJSON('https://icanhazdadjoke.com/');
      await reply(box('👨 DAD JOKE', [d.joke]));
    })
  },
  {
    command: 'affirm', category: 'fun', description: 'A positive affirmation', usage: '.affirm',
    run: wrap('Affirmation', async ({ reply }) => {
      const d = await getJSON('https://www.affirmations.dev/');
      await reply(box('🌟 AFFIRMATION', [d.affirmation]));
    })
  },
  {
    command: 'xkcd', category: 'fun', description: 'xkcd comic (random, latest, or by number)', usage: '.xkcd 927',
    run: wrap('Comic', async ctx => {
      const { args, reply } = ctx;
      const latest = await getJSON('https://xkcd.com/info.0.json');
      let n;
      if (args[0] === 'latest') {
        n = latest.num;
      } else if (args[0]) {
        n = parseInt(args[0], 10);
        if (!n || n < 1 || n > latest.num || n === 404) return reply(`❌ Pick a comic number from 1 to ${latest.num} (not 404).`);
      } else {
        do { n = 1 + Math.floor(Math.random() * latest.num); } while (n === 404);
      }
      const c = n === latest.num ? latest : await getJSON(`https://xkcd.com/${n}/info.0.json`);
      await sendCard(ctx, c.img, `🧠 xkcd #${c.num}: ${c.title}\n\n${c.alt}\n\n🔗 https://xkcd.com/${c.num}`);
    })
  },

  /* ===== GAMES ===== */
  {
    command: 'rps', category: 'games', description: 'Rock paper scissors vs the bot', usage: '.rps rock',
    run: async ({ args, reply }) => {
      const mine = RPS_ALIAS[(args[0] || '').toLowerCase()];
      if (!mine) return reply('Usage: .rps rock | paper | scissors');
      const keys = Object.keys(RPS);
      const bot = keys[Math.floor(Math.random() * keys.length)];
      const result = mine === bot ? '🤝 Draw!' : RPS[mine].beats === bot ? '🎉 You win!' : '😎 I win!';
      await reply(box('🎮 ROCK PAPER SCISSORS', [`You : ${RPS[mine].icon} ${mine}`, `Me  : ${RPS[bot].icon} ${bot}`, result]));
    }
  },
  {
    command: 'slots', category: 'games', description: 'Spin the slot machine', usage: '.slots',
    run: async ({ reply }) => {
      const spin = () => REEL[Math.floor(Math.random() * REEL.length)];
      const r = [spin(), spin(), spin()];
      let result;
      if (r[0] === r[1] && r[1] === r[2]) result = r[0] === '💎' || r[0] === '7️⃣' ? '🎉 MEGA JACKPOT!' : '🎉 JACKPOT!';
      else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) result = '✨ Two of a kind, nice!';
      else result = '😅 No luck, try again.';
      await reply(box('🎰 SLOTS', [`[ ${r.join(' | ')} ]`, result]));
    }
  },

  /* ===== SEARCH ===== */
  {
    command: 'book', category: 'search', description: 'Book info (Open Library)', usage: '.book atomic habits',
    run: wrap('Book', async ctx => {
      const { text, reply } = ctx;
      if (!text) return reply('Usage: .book atomic habits');
      const d = await getJSON(
        `https://openlibrary.org/search.json?q=${enc(text)}&limit=1&fields=key,title,author_name,first_publish_year,number_of_pages_median,cover_i,subject,ratings_average`
      );
      const b = d.docs?.[0];
      if (!b) return reply('❌ Book not found.');
      const caption = box(`📚 ${b.title}`, [
        b.author_name?.length ? `✍️ Author : ${b.author_name.slice(0, 3).join(', ')}` : '',
        b.first_publish_year ? `📅 First published : ${b.first_publish_year}` : '',
        b.number_of_pages_median ? `📄 Pages : ${b.number_of_pages_median}` : '',
        b.ratings_average ? `⭐ Rating : ${b.ratings_average.toFixed(1)}/5` : '',
        b.subject?.length ? `🏷️ ${b.subject.slice(0, 4).join(', ')}` : '',
        `🔗 https://openlibrary.org${b.key}`
      ]);
      await sendCard(ctx, b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-L.jpg` : null, caption);
    })
  },
  {
    command: 'songinfo', category: 'search', description: 'Song info with a 30s preview (iTunes)', usage: '.songinfo blinding lights',
    run: wrap('Song', async ctx => {
      const { text, reply, sock, from, msg } = ctx;
      if (!text) return reply('Usage: .songinfo blinding lights');
      const d = await getJSON(`https://itunes.apple.com/search?term=${enc(text)}&media=music&entity=song&limit=1`);
      const t = d.results?.[0];
      if (!t) return reply('❌ Song not found.');
      const secs = Math.round((t.trackTimeMillis || 0) / 1000);
      const caption = box(`🎵 ${t.trackName}`, [
        `🎤 Artist : ${t.artistName}`,
        t.collectionName ? `💿 Album : ${t.collectionName}` : '',
        `🎼 Genre : ${t.primaryGenreName}`,
        t.releaseDate ? `📅 Released : ${String(t.releaseDate).slice(0, 10)}` : '',
        secs ? `⏱️ Length : ${Math.floor(secs / 60)}:${pad2(secs % 60)}` : '',
        t.trackViewUrl ? `🔗 ${t.trackViewUrl}` : ''
      ]);
      await sendCard(ctx, t.artworkUrl100 ? t.artworkUrl100.replace('100x100', '600x600') : null, caption);
      if (t.previewUrl) {
        try {
          await sock.sendMessage(from, { audio: { url: t.previewUrl }, mimetype: 'audio/mp4' }, { quoted: msg });
        } catch { /* preview is optional */ }
      }
    })
  },
  {
    command: 'holidays', category: 'search', description: 'Upcoming public holidays for a country', usage: '.holidays KE',
    run: wrap('Country', async ({ args, reply }) => {
      const cc = (args[0] || 'KE').toUpperCase();
      if (!/^[A-Z]{2}$/.test(cc)) return reply('Usage: .holidays KE (2-letter country code)');
      const list = await getJSON(`https://date.nager.at/api/v3/NextPublicHolidays/${cc}`);
      if (!list.length) return reply('❌ No upcoming holidays found.');
      const lines = list.slice(0, 8).map(h => {
        const wd = new Date(h.date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
        const local = h.localName && h.localName !== h.name ? ` (${h.localName})` : '';
        return `${h.date} ${wd} • ${h.name}${local}`;
      });
      await reply(box(`🎉 HOLIDAYS: ${cc}`, lines));
    })
  },
  {
    command: 'quake', category: 'search', description: 'Latest earthquakes M4.5+ (USGS)', usage: '.quake',
    run: wrap('Data', async ({ reply }) => {
      const d = await getJSON('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson');
      const q = (d.features || []).sort((a, b) => b.properties.time - a.properties.time).slice(0, 6);
      if (!q.length) return reply('🌍 No M4.5+ earthquakes in the last 24 hours.');
      await reply(box('🌋 EARTHQUAKES (M4.5+, 24h)', q.map(f =>
        `M${Number(f.properties.mag).toFixed(1)} • ${f.properties.place}\n┃    🕒 ${utc(f.properties.time)}`
      )));
    })
  },
  {
    command: 'stackoverflow', category: 'search', description: 'Search Stack Overflow', usage: '.stackoverflow how to center a div',
    run: wrap('Question', async ({ text, reply }) => {
      if (!text) return reply('Usage: .stackoverflow how to center a div');
      const d = await getJSON(
        `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${enc(text)}&site=stackoverflow&pagesize=4`
      );
      if (!d.items?.length) return reply('❌ No questions found.');
      await reply(box('💻 STACK OVERFLOW', d.items.map((it, i) =>
        `${i + 1}. ${trim(decodeEntities(it.title), 90)}\n┃    ${it.is_answered ? '✅' : '❔'} ${it.score} votes • ${it.answer_count} answers\n┃    🔗 ${it.link}`
      )));
    })
  },
  {
    command: 'pypi', category: 'search', description: 'PyPI package info', usage: '.pypi requests',
    run: wrap('Package', async ({ args, reply }) => {
      const name = args[0];
      if (!name) return reply('Usage: .pypi requests');
      const p = await getJSON(`https://pypi.org/pypi/${enc(name)}/json`);
      const i = p.info;
      await reply(box(`🐍 ${i.name}`, [
        `🏷️ Version : ${i.version}`,
        i.summary ? `📝 ${trim(i.summary, 150)}` : '',
        i.author ? `✍️ Author : ${trim(i.author, 60)}` : '',
        i.requires_python ? `🐍 Python : ${i.requires_python}` : '',
        i.license ? `⚖️ License : ${trim(i.license, 40)}` : '',
        `🔗 https://pypi.org/project/${i.name}/`
      ]));
    })
  },
  {
    command: 'apod', category: 'search', description: 'NASA astronomy picture of the day', usage: '.apod',
    run: wrap('Picture', async ctx => {
      const key = process.env.NASA_API_KEY || 'DEMO_KEY';
      const d = await getJSON(`https://api.nasa.gov/planetary/apod?api_key=${enc(key)}`);
      const caption = box(`🚀 ${d.title}`, [
        `📅 ${d.date}`,
        d.copyright ? `📷 ${trim(d.copyright, 60)}` : '',
        `📝 ${trim(d.explanation, 500)}`,
        d.media_type === 'video' ? `▶️ ${d.url}` : ''
      ]);
      await sendCard(ctx, d.media_type === 'image' ? d.url : null, caption);
    })
  },

  /* ===== TOOLS ===== */
  wordCmd('synonym', 'rel_syn', 'Synonyms', '🔤'),
  wordCmd('antonym', 'rel_ant', 'Antonyms', '↔️'),
  wordCmd('rhyme', 'rel_rhy', 'Rhymes', '🎤'),
  {
    command: 'color', category: 'tools', description: 'Colour info and swatch from a hex code', usage: '.color #ff5733',
    run: wrap('Colour', async ctx => {
      let hex = (ctx.args[0] || '').replace('#', '').toLowerCase();
      if (/^[0-9a-f]{3}$/.test(hex)) hex = hex.split('').map(c => c + c).join('');
      if (!/^[0-9a-f]{6}$/.test(hex)) return ctx.reply('Usage: .color #ff5733');
      const c = await getJSON(`https://www.thecolorapi.com/id?hex=${hex}`);
      const caption = box(`🎨 ${c.name?.value || hex.toUpperCase()}`, [
        `🔖 HEX : ${c.hex?.value || '#' + hex}`,
        `🔴 RGB : ${c.rgb?.value || ''}`,
        `🌈 HSL : ${c.hsl?.value || ''}`,
        c.cmyk?.value ? `🖨️ CMYK : ${c.cmyk.value}` : ''
      ]);
      await sendCard(ctx, `https://singlecolorimage.com/get/${hex}/400x200`, caption);
    })
  },
  {
    command: 'convert', category: 'tools',
    description: 'Convert units (length, mass, volume, temperature, speed, area, data, time)',
    usage: '.convert 10 km mi',
    run: async ({ args, reply }) => {
      let parts = args.filter(a => a.toLowerCase() !== 'to');
      const glued = parts[0] && parts[0].match(/^(-?\d*\.?\d+)([a-z°/][a-z°/0-9]*)$/i);
      if (glued) parts = [glued[1], glued[2], ...parts.slice(1)];
      const value = parseFloat(parts[0]);
      const from = normUnit(parts[1]);
      const to = normUnit(parts[2]);
      if (parts.length < 3 || Number.isNaN(value)) {
        return reply('Usage: .convert 10 km mi\nTypes: length, mass, volume, temperature (c f k), speed, area, data, time');
      }
      let result;
      if (TEMP.to[from] && TEMP.to[to]) {
        result = TEMP.from[to](TEMP.to[from](value));
      } else {
        const group = Object.values(UNIT_GROUPS).find(g => g[from] && g[to]);
        if (!group) return reply(`❌ Can't convert "${parts[1]}" to "${parts[2]}". Both units must be the same type.`);
        result = (value * group[from]) / group[to];
      }
      await reply(box('🔁 CONVERT', [`${fmtNum(value)} ${from} = *${fmtNum(result)} ${to}*`]));
    }
  },
  {
    command: 'age', category: 'tools', description: 'Age calculator from a birth date', usage: '.age 2000-05-17',
    run: async ({ args, reply }) => {
      const parsed = parseFullDate(args[0] || '');
      if (!parsed) return reply('Usage: .age 2000-05-17 (or 17/05/2000)');
      const [y, mo, d] = parsed;
      const now = new Date();
      const ty = now.getUTCFullYear(), tm = now.getUTCMonth() + 1, td = now.getUTCDate();
      const today = Date.UTC(ty, tm - 1, td);
      const birth = Date.UTC(y, mo - 1, d);
      if (birth > today) return reply('❌ That date is in the future.');
      let years = ty - y, months = tm - mo, days = td - d;
      if (days < 0) { months--; days += new Date(Date.UTC(ty, tm - 1, 0)).getUTCDate(); }
      if (months < 0) { years--; months += 12; }
      if (years > 130) return reply('❌ That date looks too far in the past.');
      let next = Date.UTC(ty, mo - 1, d);
      if (next < today) next = Date.UTC(ty + 1, mo - 1, d);
      const toBday = Math.round((next - today) / 86400000);
      await reply(box('🎂 AGE', [
        `📆 ${years} years, ${months} months, ${days} days`,
        `🗓️ Days lived : ${num(Math.floor((today - birth) / 86400000))}`,
        `📅 Born on a : ${new Date(birth).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })}`,
        toBday === 0 ? '🎉 Happy birthday! It is today!' : `🎈 Next birthday in ${toBday} days`
      ]));
    }
  },
  {
    command: 'bmi', category: 'tools', description: 'BMI calculator (kg and cm)', usage: '.bmi 70 175',
    run: async ({ args, reply }) => {
      const kg = parseFloat(args[0]);
      let h = parseFloat(args[1]);
      if (h > 0 && h < 3) h *= 100; // allow metres
      if (!(kg >= 2 && kg <= 500) || !(h >= 50 && h <= 260)) return reply('Usage: .bmi 70 175 (weight in kg, height in cm)');
      const m = h / 100;
      const bmi = kg / (m * m);
      const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : bmi < 30 ? 'Overweight' : 'Obese';
      await reply(box('⚖️ BMI', [
        `📊 BMI : ${bmi.toFixed(1)}`,
        `🏷️ Category : ${cat}`,
        `✅ Healthy range at ${Math.round(h)} cm : ${(18.5 * m * m).toFixed(1)} to ${(24.9 * m * m).toFixed(1)} kg`,
        'ℹ️ A general guide only, not medical advice.'
      ]));
    }
  },
  {
    command: 'zodiac', category: 'tools', description: 'Star sign from a birthday', usage: '.zodiac 17 may',
    run: async ({ args, reply }) => {
      let month, day;
      const full = parseFullDate(args[0] || '');
      if (full) {
        [, month, day] = full;
      } else if (args.length >= 2) {
        day = parseInt(args[0], 10);
        const second = args[1].toLowerCase();
        month = /^\d+$/.test(second) ? parseInt(second, 10) : MONTHS.indexOf(second.slice(0, 3)) + 1;
      }
      if (!month || !day || month < 1 || month > 12 || day < 1 || day > daysIn(month)) {
        return reply('Usage: .zodiac 17 may (or .zodiac 2000-05-17)');
      }
      const [, , name, icon, element] = signFor(month, day);
      await reply(box('🔮 ZODIAC', [`${icon} Sign : ${name}`, `🌀 Element : ${element}`]));
    }
  },
  {
    command: 'hash', category: 'tools', description: 'Hash text (md5, sha1, sha256, sha512)', usage: '.hash sha256 hello',
    run: async ({ args, reply }) => {
      const algos = ['md5', 'sha1', 'sha256', 'sha512'];
      let algo = 'sha256';
      let input = args.join(' ');
      if (algos.includes((args[0] || '').toLowerCase())) {
        algo = args[0].toLowerCase();
        input = args.slice(1).join(' ');
      }
      if (!input) return reply('Usage: .hash sha256 hello\nAlgorithms: md5, sha1, sha256, sha512');
      await reply(box(`🔐 ${algo.toUpperCase()}`, [crypto.createHash(algo).update(input).digest('hex')]));
    }
  },
  {
    command: 'dns', category: 'tools', description: 'DNS lookup (A, AAAA, MX, NS)', usage: '.dns example.com',
    run: async ({ args, reply }) => {
      const host = (args[0] || '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)) {
        return reply('Usage: .dns example.com');
      }
      const timeout = p => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))]);
      const [a, aaaa, mx, ns] = await Promise.allSettled([
        timeout(dnsp.resolve4(host)), timeout(dnsp.resolve6(host)),
        timeout(dnsp.resolveMx(host)), timeout(dnsp.resolveNs(host))
      ]);
      const ok = r => r.status === 'fulfilled' && r.value.length;
      if (![a, aaaa, mx, ns].some(ok)) return reply(`❌ Could not resolve ${host}.`);
      await reply(box(`🌐 DNS: ${host}`, [
        ok(a) ? `🅰️ A : ${a.value.slice(0, 4).join(', ')}` : '',
        ok(aaaa) ? `6️⃣ AAAA : ${aaaa.value.slice(0, 2).join(', ')}` : '',
        ok(mx) ? `📧 MX : ${[...mx.value].sort((x, y) => x.priority - y.priority).slice(0, 3).map(m => m.exchange).join(', ')}` : '',
        ok(ns) ? `🗂️ NS : ${ns.value.slice(0, 3).join(', ')}` : ''
      ]));
    }
  }
];