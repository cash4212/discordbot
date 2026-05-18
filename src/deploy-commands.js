import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { data as lookupCommand } from './commands/lookup.js';

config();

const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) { console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID'); process.exit(1); }

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: [lookupCommand.toJSON()] });
    console.log('Slash commands registered.');
  } catch (err) { console.error(err); process.exit(1); }
})();
