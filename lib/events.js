const { getGroup } = require('./database');

async function handleGroupParticipants({ sock, update }) {
  const { id, participants, action } = update;
  const group = getGroup(id);
  const meta = await sock.groupMetadata(id).catch(() => null);
  const groupName = meta?.subject || 'Group';

  for (const jid of participants) {
    if (action === 'add' && group.welcome) {
      await sock.sendMessage(id, {
        text:
`👋 *WELCOME* @${jid.split('@')[0]}!

You just joined *${groupName}* 🎉
Please read the rules and enjoy your stay!

> _KLAUS XMD_`,
        mentions: [jid]
      }).catch(() => {});
    }

    if (action === 'remove' && group.goodbye) {
      await sock.sendMessage(id, {
        text:
`👋 *GOODBYE* @${jid.split('@')[0]}!

Thanks for being part of *${groupName}* 💫
We'll miss you!

> _KLAUS XMD_`,
        mentions: [jid]
      }).catch(() => {});
    }
  }
}

module.exports = { handleGroupParticipants };