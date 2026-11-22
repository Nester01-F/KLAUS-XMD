const { chat } = require('@chirag127/keyless-kilo');

module.exports = [
  {
    command: 'gemini',
    aliases: ['bard'],
    description: 'Ask Gemini (via keyless AI)',
    category: 'ai',
    async run({ reply, text }) {
      if (!text) return reply('✨ Example: .gemini explain gravity');

      try {
        const prompt = `Answer this question clearly and concisely: ${text}`;
        const response = await chat(prompt);

        if (!response || typeof response !== 'string') {
          throw new Error('Empty response');
        }

        reply(`✨ *AI Response*\n\n${response.slice(0, 3000)}`);
      } catch (e) {
        reply(`❌ AI failed: ${e.message}`);
      }
    }
  },
  {
    command: 'summarize',
    aliases: ['summary', 'tldr'],
    description: 'Summarize text',
    category: 'ai',
    async run({ reply, text }) {
      if (!text) return reply('📝 Paste text to summarize.');

      // Limit input to avoid huge prompts 
      const input = text.slice(0, 4000);

      try {
        const prompt = `Summarize the following text in 3 concise bullet points. Only return the bullets, no intro:\n\n${input}`;
        const response = await chat(prompt);

        if (!response || typeof response !== 'string') {
          throw new Error('Empty response');
        }

        reply(`📝 *Summary*\n\n${response.slice(0, 2000)}`);
      } catch (e) {
        reply(`❌ Summary failed: ${e.message}`);
      }
    }
  },
  {
    command: 'explain',
    aliases: ['eli5'],
    description: 'Explain something simply',
    category: 'ai',
    async run({ reply, text }) {
      if (!text) return reply('🧠 Example: .explain quantum physics');

      try {
        const prompt = `Explain this in simple terms as if to a 10-year-old: ${text}`;
        const response = await chat(prompt);

        if (!response || typeof response !== 'string') {
          throw new Error('Empty response');
        }

        reply(`🧠 *Explanation*\n\n${response.slice(0, 3000)}`);
      } catch (e) {
        reply(`❌ Failed: ${e.message}`);
      }
    }
  },
  {
    command: 'translate2',
    aliases: ['tr'],
    description: 'Translate text using AI',
    category: 'ai',
    async run({ reply, text }) {
      const parts = text.split(' ');
      const lang = parts[0];
      const content = parts.slice(1).join(' ');

      if (!lang || !content) {
        return reply('🌐 Example: .tr spanish hello world');
      }

      try {
        const prompt = `Translate the following text to ${lang}. Only return the translation:\n\n${content}`;
        const response = await chat(prompt);

        if (!response || typeof response !== 'string') {
          throw new Error('Empty response');
        }

        reply(`🌐 *Translation (${lang})*\n\n${response.slice(0, 3000)}`);
      } catch (e) {
        reply(`❌ Translation failed: ${e.message}`);
      }
    }
  }
];
