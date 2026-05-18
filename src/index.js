import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from 'dotenv';
import { data as lookupData, execute as lookupExecute } from './commands/lookup.js';

config();

const { DISCORD_TOKEN, BATTLEMETRICS_API_KEY } = process.env;
if (!DISCORD_TOKEN) { console.error('Missing DISCORD_TOKEN in .env'); process.exit(1); }
if (!BATTLEMETRICS_API_KEY) { console.error('Missing BATTLEMETRICS_API_KEY in .env'); process.exit(1); }

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
client.commands.set(lookupData.name, { data: lookupData, execute: lookupExecute });

client.once('ready', () => { console.log(`Logged in as ${client.user.tag}`); });

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    const reply = { content: `An unexpected error occurred: ${err.message.slice(0, 1900)}`, ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.editReply(reply).catch(() => {});
    else await interaction.reply(reply).catch(() => {});
  }
});

client.login(DISCORD_TOKEN);
