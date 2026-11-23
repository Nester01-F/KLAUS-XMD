/**
 * KLAUS XMD: repository commands
 * Save as plugins/repo.js (replaces your old repo plugin)
 *
 *   .repo                 -> this bot's repository card
 *   .repo owner/name      -> card for any GitHub repository
 *   .star  .fork  .issues -> quick links
 *
 * Optional env var: GITHUB_TOKEN (raises GitHub's 60 requests/hour limit)
 */

const { BANNER, panel } = require('../lib/ui');

const DEFAULT_REPO = 'https://github.com/Nester01-F/KLAUS-XMD';
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map(); // slug -> { at, data }

const num = n => Number(n || 0).toLocaleString('en-US');
const repoUrl = config => String(config.repo || DEFAULT_REPO).replace(/\/+$/, '').replace(/\.git$/, '');
const slugOf = url => url.replace(/^https?:\/\/(www\.)?github\.com\//i, '');

/* GitHub lookup with a 10 minute cache (shared hosts hit the rate limit fast) */
async function fetchRepo(slug) {
  const hit = cache.get(slug);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const headers = { 'User-Agent': 'KLAUS-XMD/1.0', Accept: 'application/vnd.github+json' };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const res = await fetch(`https://api.github.com/repos/${slug}`, { signal: ctrl.signal, headers });
    if (!res.ok) {
      const err = new Error('HTTP ' + res.status);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    cache.set(slug, { at: Date.now(), data });
    return data;
  } catch (e) {
    if (hit && e.status !== 404) return hit.data; // an old copy beats an error
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/* Image + caption; captions over WhatsApp's ~1000 character limit go as a second text */
async function sendCard({ sock, from, msg, reply }, imageUrl, caption, contextInfo) {
  try {
    const short = caption.length <= 1000;
    await sock.sendMessage(
      from,
      short ? { image: { url: imageUrl }, caption, contextInfo } : { image: { url: imageUrl }, contextInfo },
      { quoted: msg }
    );
    if (!short) await reply(caption);
  } catch {
    await reply(caption);
  }
}

function licenseOf(data) {
  const id = data.license?.spdx_id;
  return id && id !== 'NOASSERTION' ? id : data.license?.name || 'N/A';
}

function statsCaption({ data, title, config, isBot }) {
  const owner = config.ownerName || 'Warrior Felix';
  const last = String(data.pushed_at || data.updated_at || '').slice(0, 10) || 'N/A';
  let t = isBot ? BANNER + '\n\n' : '';
  t += panel(title, [
    ['⭐ Stars', `*${num(data.stargazers_count)}*`],
    ['🍴 Forks', `*${num(data.forks_count)}*`],
    ['🐛 Issues', `*${num(data.open_issues_count)}*`],
    data.language ? ['💻 Language', `*${data.language}*`] : null,
    ['💾 Size', `*${((data.size || 0) / 1024).toFixed(1)} MB*`],
    ['📅 Last push', `*${last}*`]
  ]) + '\n\n';
  t += panel('🔗 LINKS', [
    ['📦 Repo', data.html_url],
    data.homepage ? ['🌐 Website', data.homepage] : null,
    ['📝 License', licenseOf(data)]
  ]);
  if (isBot) {
    t += '\n\n💡 *Star the repo to support!*\n📌 *Fork it to customize your own bot!*';
    t += `\n\n_⚡ ${config.botName} · © 2026 ${owner}_`;
  }
  return t;
}

function fallbackCaption(config, url) {
  const p = config.prefix || '.';
  return (
    BANNER + '\n\n' +
    panel('📦 REPOSITORY', [['📦 Repo', url]]) + '\n\n' +
    `💡 *Commands*\n▸ \`${p}star\` · star the repo\n▸ \`${p}fork\` · fork the repo\n▸ \`${p}issues\` · report a bug\n\n` +
    `_⚡ ${config.botName} · © 2026 ${config.ownerName || 'Warrior Felix'}_`
  );
}

const linkCard = (title, line, url, tip) => ({ config }) => `${title}\n━━━━━━━━━━━━━━━\n${line}\n${url(config)}\n\n${tip}`;

module.exports = [
  {
    command: 'repo',
    aliases: ['source', 'code'],
    description: 'Bot repository info (or .repo owner/name for any repo)',
    category: 'main',
    async run(ctx) {
      const { args, reply, config } = ctx;
      const botUrl = repoUrl(config);
      const botSlug = slugOf(botUrl);
      let slug = botSlug;

      if (args[0]) {
        slug = args[0].replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\/+$/, '');
        if (!/^[\w.-]+\/[\w.-]+$/.test(slug)) {
          return reply(`Usage: ${config.prefix}repo (this bot) or ${config.prefix}repo owner/name`);
        }
      }
      const isBot = slug.toLowerCase() === botSlug.toLowerCase();

      let data;
      try {
        data = await fetchRepo(slug);
      } catch (e) {
        if (e.status === 404) return reply('❌ Repository not found.');
        if (!isBot) {
          return reply(
            e.status === 403 || e.status === 429
              ? '⏳ GitHub is rate-limiting requests. Try again in a few minutes.'
              : '💥 Could not reach GitHub. Try again later.'
          );
        }
        // Bot repo with GitHub unreachable: still show the links
        return sendCard(ctx, config.images.banner || config.images.menu, fallbackCaption(config, botUrl), undefined);
      }

      const title = isBot ? `📦 ${config.botName} REPOSITORY` : `🐙 ${data.full_name}`;
      const caption = statsCaption({ data, title, config, isBot });
      const image = isBot
        ? config.images.banner || config.images.menu
        : `https://opengraph.githubassets.com/1/${slug}`;
      const contextInfo = isBot
        ? {
            externalAdReply: {
              title: `${config.botName} · GitHub Repository`,
              body: `⭐ ${num(data.stargazers_count)} · 🍴 ${num(data.forks_count)} · By ${config.ownerName || 'Warrior Felix'}`,
              thumbnailUrl: config.images.alive,
              sourceUrl: data.html_url || botUrl,
              mediaType: 1
            }
          }
        : undefined;

      await sendCard(ctx, image, caption, contextInfo);
    }
  },
  {
    command: 'star',
    description: 'Get the link to star the repo',
    category: 'main',
    async run({ reply, config }) {
      await reply(
        linkCard('⭐ *STAR THE REPO!*', 'Help us grow by starring:', c => `${repoUrl(c)}/stargazers`,
          '💡 Every ⭐ motivates the developer!')({ config })
      );
    }
  },
  {
    command: 'fork',
    description: 'Get the link to fork the repo',
    category: 'main',
    async run({ reply, config }) {
      await reply(
        linkCard('🍴 *FORK THE REPO!*', 'Create your own version:', c => `${repoUrl(c)}/fork`,
          '💡 Customize, deploy, and make it yours!')({ config })
      );
    }
  },
  {
    command: 'issues',
    description: 'Report a bug or request a feature',
    category: 'main',
    async run({ reply, config }) {
      await reply(
        '🐛 *REPORT ISSUES*\n━━━━━━━━━━━━━━━\nFound a bug or want a feature?\n' +
          `${repoUrl(config)}/issues/new\n\n` +
          '📝 *Tips:*\n▸ Describe the problem clearly\n▸ Include steps to reproduce\n▸ Attach screenshots if possible'
      );
    }
  }
];