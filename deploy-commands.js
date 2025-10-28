import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const thanks = new SlashCommandBuilder()
  .setName('thanks')
  .setDescription('Send a thank-you message for a purchase (English).')
  .addUserOption(opt =>
    opt.setName('user')
      .setDescription('Select a Discord user to mention')
      .setRequired(false))
  .addStringOption(opt =>
    opt.setName('user_id')
      .setDescription('Alternative: provide a Discord user ID (will ping)')
      .setRequired(false))
  .addStringOption(opt =>
    opt.setName('name')
      .setDescription('Alternative: display name (no ping)')
      .setRequired(false))
  .addBooleanOption(opt =>
    opt.setName('dm')
      .setDescription('Also send a DM to the user?')
      .setRequired(false));

const thanksMulti = new SlashCommandBuilder()
  .setName('thanks-multi')
  .setDescription('Thank multiple buyers at once.')
  .addStringOption(opt =>
    opt.setName('targets')
      .setDescription('Comma or space separated: mentions, IDs, or names')
      .setRequired(true))
  .addBooleanOption(opt =>
    opt.setName('dm')
      .setDescription('Also send DMs to all resolved users?')
      .setRequired(false));

const commands = [thanks, thanksMulti].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function main() {
  const { CLIENT_ID, GUILD_ID } = process.env;
  if (!CLIENT_ID || !GUILD_ID) {
    console.error('Please set CLIENT_ID and GUILD_ID in .env');
    process.exit(1);
  }
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log('✅ Slash commands deployed to guild:', GUILD_ID);
}
main().catch(console.error);
