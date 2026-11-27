const axios = require('axios');

const API = 'https://prexzyapis.com';

module.exports = [
  /* ═══════════════════════════════════════════════════════════
     ⚽ LIVESCORES — all competitions
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'livescore',
    aliases: ['livescores', 'scores', 'football'],
    description: 'Live football scores',
    category: 'sports',
    async run({ reply, text }) {
      await reply('⚽ Fetching live scores...');
      try {
        const { data } = await axios.get(`${API}/sports/goallivescore`, {
          timeout: 20000
        });

        if (!data.status || !data.data) {
          throw new Error('No data returned');
        }

        // Filter competition by search term if provided
        const filter = text?.trim().toLowerCase();
        let competitions = data.data;

        if (filter) {
          competitions = competitions.filter(c =>
            c.competition.toLowerCase().includes(filter)
          );
          if (!competitions.length) {
            return reply(`❌ No competition matching *${filter}*\n\nTry: premier, laliga, serie, bundesliga, ligue`);
          }
        }

        // Build output — cap at 5 competitions to keep message size manageable
        let txt = `⚽ *LIVE SCORES*\n`;
        txt += `━━━━━━━━━━━━━━━\n`;
        txt += `📊 ${data.competitions} competitions\n\n`;

        let count = 0;
        for (const comp of competitions.slice(0, 5)) {
          if (!comp.matches?.length) continue;
          txt += `🏆 *${comp.competition}* (${comp.area})\n`;

          for (const m of comp.matches.slice(0, 5)) {
            const status = m.status;
            const time = m.period
              ? `${m.period.minute}'`
              : new Date(m.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

            if (status === 'Live') {
              txt += `🔴 ${m.homeTeam} *${m.homeScore}-${m.awayScore}* ${m.awayTeam} (${time})\n`;
            } else if (status === 'Not Started') {
              txt += `⏳ ${m.homeTeam} vs ${m.awayTeam} (${time})\n`;
            } else {
              txt += `✅ ${m.homeTeam} *${m.homeScore}-${m.awayScore}* ${m.awayTeam}\n`;
            }
          }
          txt += '\n';
          count++;

          if (count >= 5) break;
        }

        if (count === 0) {
          return reply(`⚽ No matches found${filter ? ` for *${filter}*` : ''}`);
        }

        txt += `━━━━━━━━━━━━━━━\n`;
        txt += `_${competitions.length} competitions total_\n`;
        txt += `_Use .livescore premier to filter_`;

        reply(txt);
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     🔴 LIVE ONLY — matches currently playing
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'live',
    aliases: ['nowplaying', 'livefootball'],
    description: 'Matches currently live',
    category: 'sports',
    async run({ reply }) {
      await reply('🔴 Fetching live matches...');
      try {
        const { data } = await axios.get(`${API}/sports/goallivescore`, {
          timeout: 20000
        });

        if (!data.status || !data.data) throw new Error('No data');

        let txt = `🔴 *LIVE MATCHES NOW*\n`;
        txt += `━━━━━━━━━━━━━━━\n\n`;

        let count = 0;
        for (const comp of data.data) {
          const liveMatches = comp.matches?.filter(m => m.status === 'Live') || [];
          if (!liveMatches.length) continue;

          txt += `🏆 *${comp.competition}*\n`;
          for (const m of liveMatches) {
            const min = m.period?.minute || 0;
            const extra = m.period?.extra || 0;
            const time = extra > 0 ? `${min}+${extra}'` : `${min}'`;
            txt += `⚽ ${m.homeTeam} *${m.homeScore}-${m.awayScore}* ${m.awayTeam} (${time})\n`;
          }
          txt += '\n';
          count += liveMatches.length;
        }

        if (count === 0) {
          return reply('🔴 *No live matches right now*');
        }

        txt += `━━━━━━━━━━━━━━━\n`;
        txt += `📊 *${count}* matches live`;

        reply(txt);
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     📅 TODAY'S FIXTURES — upcoming matches
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'fixtures',
    aliases: ['upcoming', 'todaymatches'],
    description: "Today's football fixtures",
    category: 'sports',
    async run({ reply }) {
      await reply('📅 Fetching fixtures...');
      try {
        const { data } = await axios.get(`${API}/sports/goallivescore`, {
          timeout: 20000
        });

        if (!data.status || !data.data) throw new Error('No data');

        const today = new Date().toDateString();
        let txt = `📅 *TODAY'S FIXTURES*\n`;
        txt += `━━━━━━━━━━━━━━━\n\n`;

        let count = 0;
        for (const comp of data.data) {
          const todayMatches = comp.matches?.filter(m =>
            new Date(m.startTime).toDateString() === today &&
            m.status === 'Not Started'
          ) || [];
          if (!todayMatches.length) continue;

          txt += `🏆 *${comp.competition}*\n`;
          for (const m of todayMatches.slice(0, 5)) {
            const time = new Date(m.startTime).toLocaleTimeString('en-GB', {
              hour: '2-digit', minute: '2-digit'
            });
            txt += `⏰ ${time} — ${m.homeTeam} vs ${m.awayTeam}\n`;
          }
          txt += '\n';
          count += todayMatches.length;
        }

        if (count === 0) {
          return reply('📅 *No fixtures scheduled for today*');
        }

        txt += `━━━━━━━━━━━━━━━\n`;
        txt += `⚽ *${count}* matches today`;

        reply(txt);
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },

  /* ═══════════════════════════════════════════════════════════
     🏆 LEAGUES — list all competitions
     ═══════════════════════════════════════════════════════════ */
  {
    command: 'leagues',
    aliases: ['competitions'],
    description: 'List all football competitions',
    category: 'sports',
    async run({ reply }) {
      await reply('🏆 Fetching leagues...');
      try {
        const { data } = await axios.get(`${API}/sports/goallivescore`, {
          timeout: 20000
        });

        if (!data.status || !data.data) throw new Error('No data');

        let txt = `🏆 *FOOTBALL LEAGUES*\n`;
        txt += `━━━━━━━━━━━━━━━\n`;
        txt += `📊 ${data.competitions} competitions\n\n`;

        data.data.slice(0, 20).forEach((c, i) => {
          txt += `${i + 1}. ${c.competition} (${c.area})\n`;
        });

        if (data.competitions > 20) {
          txt += `\n_...and ${data.competitions - 20} more_`;
        }

        reply(txt);
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  }
];