type CachedMembership = { member: boolean; expiresAt: number };

const cache = new Map<string, CachedMembership>();
const TTL_MS = 60_000;

export async function isDiscordMember(discordId: string): Promise<boolean> {
  const now = Date.now();
  const cached = cache.get(discordId);
  if (cached && cached.expiresAt > now) return cached.member;

  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !guildId) return false;

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
    });
    const member = response.ok;
    cache.set(discordId, { member, expiresAt: now + TTL_MS });
    return member;
  } catch {
    // Fail closed: an unavailable Discord API must not preserve stale access.
    cache.set(discordId, { member: false, expiresAt: now + 5_000 });
    return false;
  }
}

export function clearMembershipCache() { cache.clear(); }
