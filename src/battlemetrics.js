const BASE_URL = 'https://api.battlemetrics.com';

async function bmFetch(path, apiKey) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) { const text = await res.text(); throw new Error(`BattleMetrics ${res.status}: ${text}`); }
  return res.json();
}

export async function findPlayerBySteamId(steamId64, apiKey) {
  const data = await bmFetch(`/players?filter[search]=${steamId64}&include=identifier`, apiKey);
  const included = data.included ?? [];
  const match = included.find(i => i.type === 'identifier' && i.attributes?.type === 'steamID' && i.attributes?.identifier === steamId64);
  if (!match) return null;
  const playerId = match.relationships?.player?.data?.id;
  if (!playerId) return null;
  const player = data.data.find(p => p.id === playerId);
  if (!player) return null;
  return { id: playerId, name: player.attributes.name, profileUrl: `https://www.battlemetrics.com/players/${playerId}` };
}

export async function getRustBans(bmPlayerId, apiKey) {
  const data = await bmFetch(`/bans?filter[player]=${bmPlayerId}&include=server&page[size]=10`, apiKey);
  const servers = new Map((data.included ?? []).filter(i => i.type === 'server').map(s => [s.id, s.attributes.name]));
  return (data.data ?? []).map(ban => {
    const serverId = ban.relationships?.server?.data?.id;
    return {
      id: ban.id,
      reason: ban.attributes.reason ?? 'No reason provided',
      note: ban.attributes.note ?? null,
      expires: ban.attributes.expires,
      created: ban.attributes.timestamp,
      permanent: !ban.attributes.expires,
      serverName: serverId ? (servers.get(serverId) ?? 'Unknown server') : 'Unknown server',
    };
  });
}
