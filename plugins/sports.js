const axios = require('axios');

const API = 'https://prexzyapis.com';
const API_KEY = process.env.PREXZY_APIKEY || '';          // only if the provider gives you a key
const TZ = process.env.BOT_TIMEZONE || 'Africa/Nairobi';  // times and "today" use this zone, not the server's
const CACHE_MS = 30 * 1000;                               // all four commands share one fetch per 30s
const MAX_CHARS = 3800;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Fallback source (ESPN's public scoreboard JSON: no key, undocumented, so it could change)
const ESPN_LEAGUES = ['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'uefa.champions', 'uefa.europa', 'usa.1'];

/* ── HTTP ───────────────────────────────────────────────────── */
async function getJson(url, timeout = 20000) {
  try {
    const res = await axios.get(url, { timeout, headers: { 'User-Agent': UA, Accept: 'application/json' } });
    return res.data;
  } catch (e) {
    const raw = e.response?.data;
    const body = (typeof raw === 'string' ? raw : JSON.stringify(raw || '')).replace(/\s+/g, ' ').slice(0, 100);
    throw new Error(`${new URL(url).hostname} ${e.response?.status || e.code} ${body}`.trim());
  }
}

/* ── Time helpers (always in TZ) ────────────────────────────── */
const fmtTime = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? '--:--' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
};
const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD

/* ── Providers: both return the same shape ──────────────────── */
// [{ competition, area, matches: [{ home, away, hs, as, state: 'live'|'pre'|'post', start, clock, note }] }]
async function fromPrexzy() {
  const url = `${API}/sports/goallivescore${API_KEY ? `?apikey=${encodeURIComponent(API_KEY)}` : ''}`;
  const data = await getJson(url);
  if (!data?.status || !Array.isArray(data.data)) throw new Error('prexzyapis: unexpected response');

  return data.data.map((c) => ({
    competition: c.competition || 'Unknown',
    area: c.area || '',
    matches: (c.matches || []).map((m) => {
      const p = m.period;
      return {
        home: m.homeTeam, away: m.awayTeam,
        hs: m.homeScore ?? 0, as: m.awayScore ?? 0,
        state: m.status === 'Live' ? 'live' : m.status === 'Not Started' ? 'pre' : 'post',
        start: m.startTime,
        clock: p ? (p.extra > 0 ? `${p.minute}+${p.extra}'` : `${p.minute}'`) : '',
        note: !['Live', 'Not Started', 'Finished'].includes(m.status) ? m.status : ''
      };
    })
  }));
}

async function fromEspn() {
  const results = await Promise.allSettled(
    ESPN_LEAGUES.map((slug) => getJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard`, 15000))
  );
  if (results.every((r) => r.status === 'rejected')) throw new Error(results[0].reason.message);

  const out = [];
  results.forEach((r, i) => {
    if (r.status !== 'fulfilled') return;
    const events = r.value?.events || [];
    if (!events.length) return;

    out.push({
      competition: r.value.leagues?.[0]?.name || ESPN_LEAGUES[i],
      area: '',
      matches: events.map((ev) => {
        const comp = ev.competitions?.[0];
        const home = comp?.competitors?.find((x) => x.homeAway === 'home');
        const away = comp?.competitors?.find((x) => x.homeAway === 'away');
        const st = ev.status?.type?.state; // 'pre' | 'in' | 'post'
        const detail = ev.status?.type?.shortDetail || '';
        return {
          home: home?.team?.displayName || '?', away: away?.team?.displayName || '?',
          hs: home?.score ?? 0, as: away?.score ?? 0,
          state: st === 'in' ? 'live' : st === 'post' ? 'post' : 'pre',
          start: ev.date,
          clock: st === 'in' ? (detail === 'HT' ? 'HT' : ev.status?.displayClock || '') : '',
          note: st === 'post' && detail && detail !== 'FT' ? detail : ''
        };
      })
    });
  });
  return out;
}

/* ── Cached fetch with fallback ─────────────────────────────── */
let cached = { at: 0, data: null, source: '' };

async function getData() {
  if (cached.data && Date.now() - cached.at < CACHE_MS) return cached;

  const errors = [];
  for (const [source, fn] of [['prexzyapis', fromPrexzy], ['espn', fromEspn]]) {
    try {
      cached = { at: Date.now(), data: await fn(), source };
      return cached;
    } catch (e) {
      errors.push(e.message);
    }
  }
  throw new Error(errors.join(' | '));
}

/* ── Formatting ─────────────────────────────────────────────── */
const line = (m) => {
  if (m.state === 'live') return `🔴 ${m.home} *${m.hs}-${m.as}* ${m.away}${m.clock ? ` (${m.clock})` : ''}`;
  if (m.state === 'pre') return `⏳ ${m.home} vs ${m.away} (${fmtTime(m.start)})`;
  return `✅ ${m.home} *${m.hs}-${m.as}* ${m.away}${m.note ? ` (${m.note})` : ''}`;
};

const title = (c) => `🏆 *${c.competition}*${c.area ? ` (${c.area})` : ''}`;
const footer = (source) => (source === 'espn' ? '\n_via ESPN (main API unavailable)_' : '');
const clip = (t) => (t.length > MAX_CHARS ? `${t.slice(0, MAX_CHARS)}\n…_(trimmed)_` : t);

const HR = '━━━━━━━━━━━━━━━';

async function run(reply, label, build) {
  await reply(label);
  try {
    const { data, source } = await getData();
    const txt = build(data);
    if (txt) reply(clip(txt + footer(source)));
  } catch (e) {
    console.error('[sports]', e.message);
    reply(`❌ Failed: ${e.message}`);
  }
}

module.exports = [
  /* ═══ ⚽ LIVESCORE ═══ */
  {
    command: 'livescore',
    aliases: ['livescores', 'scores', 'football'],
    description: 'Live football scores',
    category: 'sports',
    async run({ reply, text }) {
      const filter = text?.trim().toLowerCase();
      await run(reply, '⚽ Fetching live scores...', (data) => {
        // keep only competitions that have matches, THEN apply the filter and the cap
        let comps = data.filter((c) => c.matches.length);
        if (filter) {
          comps = comps.filter((c) => c.competition.toLowerCase().includes(filter));
          if (!comps.length) {
            return reply(`❌ No competition matching *${filter}*\n\nTry: premier, laliga, serie, bundesliga, ligue`) && null;
          }
        }
        if (!comps.length) return reply('⚽ No matches found') && null;

        let txt = `⚽ *LIVE SCORES*\n${HR}\n📊 ${comps.length} competitions with matches\n\n`;
        for (const c of comps.slice(0, 5)) {
          txt += `${title(c)}\n`;
          for (const m of c.matches.slice(0, 5)) txt += `${line(m)}\n`;
          if (c.matches.length > 5) txt += `_+${c.matches.length - 5} more_\n`;
          txt += '\n';
        }
        txt += `${HR}\n`;
        if (comps.length > 5) txt += `_${comps.length - 5} more competitions hidden_\n`;
        txt += `_Use .livescore premier to filter_`;
        return txt;
      });
    }
  },

  /* ═══ 🔴 LIVE NOW ═══ */
  {
    command: 'live',
    aliases: ['nowplaying', 'livefootball'],
    description: 'Matches currently live',
    category: 'sports',
    async run({ reply }) {
      await run(reply, '🔴 Fetching live matches...', (data) => {
        let txt = `🔴 *LIVE MATCHES NOW*\n${HR}\n\n`;
        let count = 0;
        for (const c of data) {
          const live = c.matches.filter((m) => m.state === 'live');
          if (!live.length) continue;
          txt += `${title(c)}\n${live.map(line).join('\n')}\n\n`;
          count += live.length;
        }
        if (!count) return reply('🔴 *No live matches right now*') && null;
        return `${txt}${HR}\n📊 *${count}* matches live`;
      });
    }
  },

  /* ═══ 📅 FIXTURES ═══ */
  {
    command: 'fixtures',
    aliases: ['upcoming', 'todaymatches'],
    description: "Today's football fixtures",
    category: 'sports',
    async run({ reply }) {
      await run(reply, '📅 Fetching fixtures...', (data) => {
        const today = dayKey(Date.now());
        let txt = `📅 *TODAY'S FIXTURES*\n${HR}\n\n`;
        let count = 0;
        for (const c of data) {
          const todays = c.matches.filter((m) => m.state === 'pre' && dayKey(m.start) === today);
          if (!todays.length) continue;
          txt += `${title(c)}\n`;
          for (const m of todays.slice(0, 5)) txt += `⏰ ${fmtTime(m.start)} — ${m.home} vs ${m.away}\n`;
          if (todays.length > 5) txt += `_+${todays.length - 5} more_\n`;
          txt += '\n';
          count += todays.length;
        }
        if (!count) return reply('📅 *No fixtures scheduled for today*') && null;
        return `${txt}${HR}\n⚽ *${count}* matches today`;
      });
    }
  },

  /* ═══ 🏆 LEAGUES ═══ */
  {
    command: 'leagues',
    aliases: ['competitions'],
    description: 'List football competitions',
    category: 'sports',
    async run({ reply }) {
      await run(reply, '🏆 Fetching leagues...', (data) => {
        if (!data.length) return reply('🏆 No competitions found') && null;
        let txt = `🏆 *FOOTBALL LEAGUES*\n${HR}\n📊 ${data.length} competitions\n\n`;
        data.slice(0, 20).forEach((c, i) => {
          txt += `${i + 1}. ${c.competition}${c.area ? ` (${c.area})` : ''}\n`;
        });
        if (data.length > 20) txt += `\n_...and ${data.length - 20} more_`;
        return txt;
      });
    }
  }
];