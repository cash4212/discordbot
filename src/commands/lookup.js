import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { findPlayerBySteamId, getRustBans } from '../battlemetrics.js';

function isValidSteamId64(v) { return /^7656119\d{10}$/.test(v); }

function formatDate(iso) {
  if (!iso) return 'Unknown';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const data = new SlashCommandBuilder()
  .setName('lookup')
  .setDescription('Look up a SteamID64 on BattleMetrics and show Rust server bans')
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
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x888888).setTitle('Player Not Found').setDescription(`No BattleMetrics record for \`${steamId}\`. They may not have joined a tracked Rust server yet.`).addFields({ name: 'Steam Profile', value: steamUrl }).setFooter({ text: 'Data sourced from BattleMetrics' })] });
      return;
    }
    const bans = await getRustBans(player.id, apiKey);
    const embed = new EmbedBuilder()
      .setColor(bans.length > 0 ? 0xe74c3c : 0x2ecc71)
      .setTitle(player.name).setURL(player.profileUrl)
      .addFields(
        { name: 'Steam Profile', value: steamUrl, inline: true },
        { name: 'BattleMetrics', value: player.profileUrl, inline: true },
        { name: 'Rust Server Bans', value: String(bans.length), inline: true }
      )
      .setFooter({ text: 'Data sourced from BattleMetrics' }).setTimestamp();
    if (bans.length > 0) {
      embed.addFields(bans.slice(0, 10).map((ban, i) => ({
        name: `Ban #${i + 1} — ${ban.serverName}`,
        value: [
          `**Reason:** ${ban.reason}`,
          ban.note ? `**Note:** ${ban.note}` : null,
          `**Banned:** ${formatDate(ban.created)}`,
          `**Expires:** ${ban.permanent ? 'Permanent' : formatDate(ban.expires)}`
        ].filter(Boolean).join('\n'),
        inline: false
      })));
      if (bans.length > 10) embed.addFields({ name: '', value: `…and ${bans.length - 10} more. [View all on BattleMetrics](${player.profileUrl})` });
    }
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Lookup error:', err);
    await interaction.editReply({ content: `Error querying BattleMetrics: ${err.message}` });
  }
}
