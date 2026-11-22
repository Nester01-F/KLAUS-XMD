const axios = require('axios');

module.exports = [
  {
    command: 'repo',
    aliases: ['github', 'source', 'code'],
    description: 'Show bot repository info',
    category: 'main',
    async run({ sock, from, reply, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      const parts = repo.replace('https://github.com/', '').split('/');
      const owner = parts[0];
      const name = parts[1];

      try {
        const { data } = await axios.get(`https://api.github.com/repos/${owner}/${name}`, {
          timeout: 10000
        });

        const stars = data.stargazers_count;
        const forks = data.forks_count;
        const issues = data.open_issues_count;
        const size = (data.size / 1024).toFixed(1);
        const updated = new Date(data.updated_at).toLocaleDateString();

        const caption =
`╔══════════════════════════════════════╗
║      📦 *KLAUS XMD REPOSITORY*       ║
╚══════════════════════════════════════╝

┏━━━━━「 📊 STATS 」━━━━━┓
┃
┃  ⭐ Stars   »  *${stars}*
┃  🍴 Forks   »  *${forks}*
┃  🐛 Issues  »  *${issues}*
┃  💾 Size    »  *${size} MB*
┃  📅 Updated »  *${updated}*
┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━「 🔗 LINKS 」━━━━━┓
┃
┃  📦 Repo     »  ${repo}
┃  🌐 Website  »  ${data.homepage || 'N/A'}
┃  📝 License  »  ${data.license?.name || 'N/A'}
┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

💡 *Star the repo to support!*
📌 *Fork it to customize your own bot!*

> _⚡ ${config.botName} · © 2026 ${config.ownerName || 'Warrior Felix'}_`;

        await sock.sendMessage(from, {
          image: { url: config.images.banner || config.images.menu },
          caption,
          contextInfo: {
            externalAdReply: {
              title: `${config.botName} — GitHub Repository`,
              body: `⭐ ${stars} · 🍴 ${forks} · By ${config.ownerName || 'Warrior Felix'}`,
              thumbnailUrl: config.images.alive,
              sourceUrl: repo,
              mediaType: 1
            }
          }
        });
      } catch (e) {
        // Fallback if GitHub API fails (rate limit)
        const caption =
`╔══════════════════════════════════════╗
║      📦 *KLAUS XMD REPOSITORY*       ║
╚══════════════════════════════════════╝

🔗 *GitHub*: ${repo}

💡 *Commands:*
▸ \`.repo\` — show repo info
▸ \`.star\` — star the repo
▸ \`.fork\` — fork the repo

> _By ${config.ownerName || 'Warrior Felix'}_`;

        await sock.sendMessage(from, {
          image: { url: config.images.menu },
          caption,
          contextInfo: {
            externalAdReply: {
              title: `${config.botName} — GitHub`,
              body: `By ${config.ownerName || 'Warrior Felix'}`,
              thumbnailUrl: config.images.alive,
              sourceUrl: repo,
              mediaType: 1
            }
          }
        });
      }
    }
  },
  {
    command: 'star',
    description: 'Get link to star the repo',
    category: 'main',
    async run({ reply, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(
`⭐ *STAR THE REPO!*
━━━━━━━━━━━━━━━
Help us grow by starring:
${repo}/stargazers

💡 Every ⭐ motivates the developer!`
      );
    }
  },
  {
    command: 'fork',
    description: 'Get link to fork the repo',
    category: 'main',
    async run({ reply, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(
`🍴 *FORK THE REPO!*
━━━━━━━━━━━━━━━
Create your own version:
${repo}/fork

💡 Customize, deploy, and make it yours!`
      );
    }
  },
  {
    command: 'issues',
    description: 'Report a bug or request a feature',
    category: 'main',
    async run({ reply, config }) {
      const repo = config.repo || 'https://github.com/Nester01-F/KLAUS-XMD';
      reply(
`🐛 *REPORT ISSUES*
━━━━━━━━━━━━━━━
Found a bug or want a feature?
${repo}/issues/new

📝 *Tips:*
▸ Describe the problem clearly
▸ Include steps to reproduce
▸ Attach screenshots if possible`
      );
    }
  }
];