import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { findPlayerBySteamId } from '../battlemetrics.js';

function isValidSteamId64(v) { return /^7656119\d{10}$/.test(v); }

export const data = new SlashCommandBuilder()
  .setName('lookup')
  .setDescription('Look up a SteamID64 and return their BattleMetrics profile')
  .addStringOption(opt => opt.setName('steamid').setDescription('The 17-digit SteamID64 to look up').setRequired(true));

export async function execute(interaction) {
  const steamId = interaction.options.getString('steamid').trim();
  if (!isValidSteamId64(steamId)) {
    await interaction.reply({ content: `\`${steamId}\` is not a valid SteamID64. Must be 17 digits starting with \`7656119\`.`, ephemeral: true });
    return;
  }
  await interaction.deferReply();
  const apiKey = process.env.BATTLEMETRICS_API_KEY;
  const steamUrl = `https://steamcommunity.com/profiles/${steamId}`;
  try {
    const player = await findPlayerBySteamId(steamId, apiKey);
    if (!player) {
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x888888).setTitle('Player Not Found').setDescription(`No BattleMetrics record for \`${steamId}\`. They may not have joined a tracked server yet.`).addFields({ name: 'Steam Profile', value: steamUrl }).setFooter({ text: 'Data sourced from BattleMetrics' })] });
      return;
    }
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(player.name)
      .setURL(player.profileUrl)
      .addFields(
        { name: 'Steam Profile', value: steamUrl, inline: true },
        { name: 'BattleMetrics', value: player.profileUrl, inline: true }
      )
      .setFooter({ text: 'Data sourced from BattleMetrics' })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Lookup error:', err);
    await interaction.editReply({ content: `Debug error: ${err.message.slice(0, 1900)}` });
  }
}
