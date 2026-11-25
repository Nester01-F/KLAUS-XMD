const axios = require('axios');

const API = 'https://apix.wolvarex.com';
const KEY = process.env.WOLVAREX_KEY || 'wxa_f_2fca8d14eb';
const api = (path) => `${API}${path}${path.includes('?') ? '&' : '?'}key=${KEY}`;

module.exports = [
  /* ============ 🔍 GOOGLE SEARCH ============ */
  {
    command: 'google',
    aliases: ['search', 'g'],
    description: 'Google search',
    category: 'search',
    async run({ reply, text }) {
      if (!text) return reply('🔍 Example: .google weather in Nairobi');
      await reply('🔍 *Searching...*');
      try {
        // Use DuckDuckGo instant answer API (free, no key)
        const { data } = await axios.get(
          `https://api.duckduckgo.com/?q=${encodeURIComponent(text)}&format=json&no_html=1`,
          { timeout: 15000 }
        );

        const results = [];
        if (data.AbstractText) {
          results.push(`📖 *${data.Heading || text}*\n${data.AbstractText}\n🔗 ${data.AbstractURL}`);
        }
        (data.RelatedTopics || []).slice(0, 4).forEach(t => {
          if (t.Text && t.FirstURL) {
            results.push(`• *${t.Text.slice(0, 80)}*\n🔗 ${t.FirstURL}`);
          }
        });

        if (!results.length) {
          // Fallback: link to Google
          return reply(`🔍 *Search:* ${text}\n\n🔗 https://google.com/search?q=${encodeURIComponent(text)}`);
        }

        reply(`🔍 *SEARCH: ${text}*\n\n${results.join('\n\n')}`);
      } catch (e) {
        reply(`🔍 *Search:* ${text}\n\n🔗 https://google.com/search?q=${encodeURIComponent(text)}\n\n_${e.message}_`);
      }
    }
  },

  /* ============ 📰 NEWS ============ */
  {
    command: 'news',
    description: 'Latest technology news',
    category: 'search',
    async run({ reply, text }) {
      const topic = text || 'technology';
      await reply(`📰 *Fetching ${topic} news...*`);

      // Try Wolvarex first
      try {
        const { data } = await axios.get(
          api(`/api/search/news?q=${encodeURIComponent(topic)}&lang=en`),
          { timeout: 20000 }
        );

        const articles = data?.articles || data?.result || data?.results;
        if (Array.isArray(articles) && articles.length) {
          const txt = articles.slice(0, 5).map((a, i) =>
            `*${i + 1}. ${a.title || a.name}*\n${(a.description || a.snippet || '').slice(0, 120)}\n🔗 ${a.url || a.link}`
          ).join('\n\n');
          return reply(`📰 *NEWS: ${topic}*\n\n${txt}`);
        }
        throw new Error('No articles');
      } catch (e) {
        // Fallback: Google News RSS
        try {
          const { data: rss } = await axios.get(
            `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en&gl=US&ceid=US:en`,
            { timeout: 15000 }
          );
          const matches = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 5);
          if (!matches.length) throw new Error('No results');

          const txt = matches.map((m, i) => {
            const title = m[1].match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || m[1].match(/<title>(.*?)<\/title>/)?.[1] || 'Untitled';
            const link = m[1].match(/<link>(.*?)<\/link>/)?.[1] || '';
            return `*${i + 1}. ${title}*\n🔗 ${link}`;
          }).join('\n\n');

          reply(`📰 *NEWS: ${topic}*\n\n${txt}\n\n_Fallback: Google News RSS_`);
        } catch (e2) {
          reply(`❌ News unavailable. ${e.message}`);
        }
      }
    }
  },

  /* ============ 🖼️ IMAGE SEARCH ============ */
  {
    command: 'image',
    aliases: ['imgsearch', 'img2', 'imgs'],
    description: 'Image search',
    category: 'search',
    async run({ sock, from, reply, text, msg }) {
      if (!text) return reply('🖼️ Example: .image sunset');

      await reply('🖼️ *Searching images...*');
      try {
        const { data } = await axios.get(
          api(`/api/search/images?q=${encodeURIComponent(text)}&page=0`),
          { timeout: 20000 }
        );

        const images = data?.images || data?.result || data?.results;
        if (!Array.isArray(images) || !images.length) throw new Error('No images');

        const urls = images.slice(0, 4).map(img =>
          typeof img === 'string' ? img : (img.url || img.src || img.link)
        ).filter(Boolean);

        for (const url of urls) {
          try {
            await sock.sendMessage(from, {
              image: { url },
              caption: `🔍 *${text}*`
            }, { quoted: msg });
          } catch { /* skip broken */ }
        }
      } catch (e) {
        reply(`❌ Image search failed: ${e.message}`);
      }
    }
  },

  /* ============ 📚 WIKIPEDIA ============ */
  {
    command: 'wiki',
    description: 'Wikipedia summary',
    category: 'search',
    async run({ reply, text }) {
      if (!text) return reply('📚 Example: .wiki Albert Einstein');
      await reply('📚 *Looking up...*');
      try {
        const { data } = await axios.get(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`,
          { timeout: 15000 }
        );
        if (!data.extract) return reply(`❌ No Wikipedia article for *${text}*`);
        reply(
          `📚 *${data.title}*\n\n${data.extract}\n\n🔗 ${data.content_urls?.desktop?.page || ''}`
        );
      } catch (e) {
        reply(`❌ Not found: ${text}`);
      }
    }
  },

  /* ============ 📦 NPM ============ */
  {
    command: 'npm',
    aliases: ['package', 'npmpkg'],
    description: 'Search npm packages',
    category: 'search',
    async run({ reply, text }) {
      if (!text) return reply('📦 Example: .npm express');
      await reply('📦 *Searching npm...*');
      try {
        const { data } = await axios.get(
          api(`/api/search/npm?q=${encodeURIComponent(text)}`),
          { timeout: 20000 }
        );

        const packages = data?.packages || data?.result || data?.results;
        if (!Array.isArray(packages) || !packages.length) throw new Error('No packages');

        const txt = packages.slice(0, 5).map((p, i) =>
          `*${i + 1}. ${p.name}* \`v${p.version}\`\n${(p.description || '').slice(0, 100)}\n🔗 ${p.url || `https://npmjs.com/package/${p.name}`}`
        ).join('\n\n');

        reply(`📦 *NPM: ${text}*\n\n${txt}\n\n_Total: ${data.total || packages.length}_`);
      } catch (e) {
        reply(`❌ NPM search failed: ${e.message}`);
      }
    }
  },

  /* ============ 🐍 PYPI ============ */
  {
    command: 'pypi',
    aliases: ['pipsearch'],
    description: 'Search PyPI packages',
    category: 'search',
    async run({ reply, text }) {
      if (!text) return reply('🐍 Example: .pypi requests');
      await reply('🐍 *Searching PyPI...*');
      try {
        const { data } = await axios.get(
          api(`/api/search/pypi?q=${encodeURIComponent(text)}`),
          { timeout: 20000 }
        );

        const packages = data?.packages || data?.result || data?.results;
        if (!Array.isArray(packages) || !packages.length) throw new Error('No packages');

        const txt = packages.slice(0, 5).map((p, i) =>
          `*${i + 1}. ${p.name}* \`v${p.version}\`\n${(p.description || p.summary || '').slice(0, 100)}\n🔗 ${p.url || `https://pypi.org/project/${p.name}`}`
        ).join('\n\n');

        reply(`🐍 *PYPI: ${text}*\n\n${txt}`);
      } catch (e) {
        reply(`❌ PyPI search failed: ${e.message}`);
      }
    }
  },

  /* ============ 🎬 VIDEOS ============ */
  {
    command: 'videosearch',
    aliases: ['vsearch', 'vid'],
    description: 'Search videos',
    category: 'search',
    async run({ sock, from, reply, text, msg }) {
      if (!text) return reply('🎬 Example: .vid superman trailer');
      await reply('🎬 *Searching videos...*');
      try {
        const { data } = await axios.get(
          api(`/api/search/videos?q=${encodeURIComponent(text)}&page=0`),
          { timeout: 20000 }
        );

        const videos = data?.videos || data?.result || data?.results;
        if (!Array.isArray(videos) || !videos.length) throw new Error('No videos');

        const first = videos[0];
        const title = first.title || first.name || text;
        const thumb = first.thumbnail || first.thumb || first.image;
        const url = first.url || first.link || '';

        if (thumb) {
          await sock.sendMessage(from, {
            image: { url: thumb },
            caption: `🎬 *${title}*\n\n🔗 ${url}`
          }, { quoted: msg });
        } else {
          reply(`🎬 *${title}*\n\n🔗 ${url}`);
        }
      } catch (e) {
        reply(`❌ Video search failed: ${e.message}`);
      }
    }
  },

  /* ============ 🌍 COUNTRY INFO ============ */
  {
    command: 'country',
    aliases: ['countryinfo'],
    description: 'Country information',
    category: 'search',
    async run({ reply, text }) {
      if (!text) return reply('🌍 Example: .country Kenya');
      await reply('🌍 *Looking up...*');
      try {
        const { data } = await axios.get(
          `https://restcountries.com/v3.1/name/${encodeURIComponent(text)}`,
          { timeout: 15000 }
        );

        const c = Array.isArray(data) ? data[0] : data;
        if (!c) return reply('❌ Country not found.');

        reply(
          `🌍 *${c.name.common}*\n━━━━━━━━━━━━━━━\n` +
          `🏛️ Capital: *${c.capital?.[0] || 'N/A'}*\n` +
          `👥 Population: *${c.population?.toLocaleString() || 'N/A'}*\n` +
          `🌐 Region: *${c.region || 'N/A'}*\n` +
          `💰 Currency: *${Object.values(c.currencies || {})[0]?.name || 'N/A'}*\n` +
          `🗣️ Languages: ${Object.values(c.languages || {}).join(', ') || 'N/A'}\n` +
          `🚩 Flag: ${c.flag || ''}`
        );
      } catch (e) {
        reply(`❌ Country not found: ${text}`);
      }
    }
  },

  /* ============ 💬 URBAN DICTIONARY ============ */
  {
    command: 'urban',
    aliases: ['ud', 'define2'],
    description: 'Urban Dictionary lookup',
    category: 'search',
    async run({ reply, text }) {
      if (!text) return reply('💬 Example: .urban vibe');
      await reply('💬 *Looking up...*');
      try {
        const { data } = await axios.get(
          `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(text)}`,
          { timeout: 15000 }
        );

        const def = data.list?.[0];
        if (!def) return reply(`❌ No definition for *${text}*`);

        const clean = (s) => s.replace(/\[|\]/g, '').slice(0, 400);
        reply(
          `💬 *${def.word}*\n━━━━━━━━━━━━━━━\n\n${clean(def.definition)}\n\n` +
          (def.example ? `📝 _${clean(def.example)}_\n\n` : '') +
          `👍 ${def.thumbs_up} | 👎 ${def.thumbs_down}`
        );
      } catch (e) {
        reply(`❌ Urban lookup failed: ${e.message}`);
      }
    }
  },

  /* ============ 📚 STACK OVERFLOW ============ */
  {
    command: 'stack',
    aliases: ['so', 'stackoverflow'],
    description: 'Stack Overflow search',
    category: 'search',
    async run({ reply, text }) {
      if (!text) return reply('📚 Example: .stack how to reverse string python');
      await reply('📚 *Searching Stack Overflow...*');
      try {
        const { data } = await axios.get(
          `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(text)}&site=stackoverflow`,
          { timeout: 15000 }
        );

        const items = data.items?.slice(0, 5) || [];
        if (!items.length) return reply('❌ No results.');

        const txt = items.map((q, i) =>
          `*${i + 1}. ${q.title}*\n` +
          `✅ ${q.is_answered ? 'Answered' : 'Unanswered'} | ⬆️ ${q.score}\n` +
          `🔗 ${q.link}`
        ).join('\n\n');

        reply(`📚 *STACK OVERFLOW: ${text}*\n\n${txt}`);
      } catch (e) {
        reply(`❌ SO search failed: ${e.message}`);
      }
    }
  }
];