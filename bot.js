import 'dotenv/config';
import { Client, GatewayIntentBits, Events, PermissionFlagsBits } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const MESSAGES = [
  "Thank you for buying, and thank you for trusting in the service! 🙏",
  "Big thanks for your purchase — and for trusting our service! 🎉",
  "Appreciate your support and your trust in the service. Thank you for buying! 💙",
  "Thanks for the purchase! Your trust means a lot to us. ✨",
  "Grateful for your purchase and your trust in the service. Thank you! 🤝"
];

function pickMessage() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

function isValidSnowflake(id) {
  return /^\d{8,30}$/.test(id);
}

function mentionFromInputs({ user, userId, name }) {
  if (user) return `<@${user.id}>`;
  if (userId && isValidSnowflake(userId)) return `<@${userId}>`;
  if (name) return `@${name}`; // no ping
  return null;
}

function parseTargets(input) {
  // Accepts comma or space separated tokens: <@123>, 123456, @Name, Name
  const tokens = input.split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
  const mentions = [];
  for (const t of tokens) {
    const m = t.match(/^<@!?(?<id>\d{8,30})>$/);
    if (m?.groups?.id) {
      mentions.push(`<@${m.groups.id}>`);
      continue;
    }
    if (isValidSnowflake(t)) {
      mentions.push(`<@${t}>`);
      continue;
    }
    // strip leading '@' if present
    const name = t.replace(/^@/, '');
    if (name.length > 0) {
      mentions.push(`@${name}`); // visible, not pinging
    }
  }
  return mentions;
}

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'thanks') {
      const targetUser = interaction.options.getUser('user');
      const userId = interaction.options.getString('user_id')?.trim();
      const nameOnly = interaction.options.getString('name')?.trim();
      const sendDm = interaction.options.getBoolean('dm') ?? false;

      const mentionText = mentionFromInputs({ user: targetUser, userId, name: nameOnly });
      if (!mentionText) {
        await interaction.reply({ content: 'Provide at least one: user, user_id, or name.', ephemeral: true });
        return;
      }

      const msg = `${pickMessage()}\n${mentionText}`;

      // Acknowledge ephemerally to hide the command usage
      await interaction.reply({ content: '✅ Sent.', ephemeral: true });

      // Public message
      const canSend = interaction.channel?.permissionsFor?.(client.user)?.has(PermissionFlagsBits.SendMessages) ?? false;
      if (canSend) await interaction.channel.send(msg);

      // Optional DM (only if we have a resolvable user object or valid ID)
      if (sendDm) {
        try {
          const dmTargetId = targetUser?.id || (isValidSnowflake(userId) ? userId : null);
          if (dmTargetId) {
            const user = await client.users.fetch(dmTargetId);
            await user.send(pickMessage());
          }
        } catch {}
      }
      return;
    }

    if (interaction.commandName === 'thanks-multi') {
      const targetsRaw = interaction.options.getString('targets')?.trim();
      const sendDm = interaction.options.getBoolean('dm') ?? false;
      if (!targetsRaw) {
        await interaction.reply({ content: 'Please provide at least one target.', ephemeral: true });
        return;
      }

      const mentions = parseTargets(targetsRaw);
      if (mentions.length === 0) {
        await interaction.reply({ content: 'Could not resolve any targets. Provide mentions, IDs, or names.', ephemeral: true });
        return;
      }

      // Build one combined message, chunk if necessary
      const header = pickMessage();
      const body = mentions.join('\n');
      let payload = `${header}\n${body}`;

      await interaction.reply({ content: '✅ Sent.', ephemeral: true });

      const canSend = interaction.channel?.permissionsFor?.(client.user)?.has(PermissionFlagsBits.SendMessages) ?? false;
      if (canSend) {
        // Discord limit safeguard
        if (payload.length > 1800) {
          // split roughly
          const lines = body.split(/\n/);
          let buf = header, first = true;
          for (const line of lines) {
            if ((buf + '\n' + line).length > 1800) {
              await interaction.channel.send(buf);
              buf = first ? line : header + '\n' + line; // ensure header for first split only
              first = false;
            } else {
              buf += (first && buf === header ? '\n' : '\n') + line;
              first = false;
            }
          }
          if (buf) await interaction.channel.send(buf);
        } else {
          await interaction.channel.send(payload);
        }
      }

      if (sendDm) {
        // Try DM for each resolvable mention/ID
        for (const token of targetsRaw.split(/[\s,]+/)) {
          const m = token.match(/^<@!?(?<id>\d{8,30})>$/);
          const id = m?.groups?.id || (isValidSnowflake(token) ? token : null);
          if (!id) continue;
          try {
            const user = await client.users.fetch(id);
            await user.send(pickMessage());
          } catch {}
        }
      }
      return;
    }
  } catch (err) {
    console.error(err);
    if (interaction.isRepliable()) {
      await interaction.reply({ content: 'Something went wrong handling this command.', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
