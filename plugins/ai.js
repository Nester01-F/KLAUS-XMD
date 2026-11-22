const { chat } = require('@chirag127/keyless-kilo');

module.exports = [
  {
    command: 'ai',
    aliases: ['gpt', 'chat', 'ask'],
    description: 'Ask AI (keyless)',
    category: 'ai',
    async run({ reply, text }) {
      if (!text) return reply('🤖 Example: .ai what is love?');
      
      try {
        // The chat() function takes a string prompt directly
        const response = await chat(text);
        
        // Ensure response is a string and not empty
        if (!response || typeof response !== 'string') {
          throw new Error('Empty response from AI');
        }

        reply(`🤖 *AI Response*\n\n${response.slice(0, 3000)}`);
      } catch (e) {
        reply(`❌ AI failed: ${e.message}`);
      }
    }
  }
];