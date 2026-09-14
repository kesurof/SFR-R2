type CachedMembership = { member: boolean; expiresAt: number };

const cache = new Map<string, CachedMembership>();
const MEMBER_TTL_MS = 60_000;
const TRANSIENT_TTL_MS = 5_000;

/**
 * Durée pendant laquelle mémoriser le résultat d'une vérification. Une réponse
 * définitive (membre ou 404) est gardée plus longtemps ; une erreur transitoire
 * (429, 5xx, réseau) est réessayée rapidement au lieu de verrouiller un membre.
 */
export function membershipCacheTtl(status: number | null): number {
  if (status === null) return TRANSIENT_TTL_MS;
  if (status === 404 || (status >= 200 && status < 300)) return MEMBER_TTL_MS;
  return TRANSIENT_TTL_MS;
}

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
    cache.set(discordId, { member, expiresAt: now + membershipCacheTtl(response.status) });
    return member;
  } catch {
    // Fail closed: an unavailable Discord API must not preserve stale access.
    cache.set(discordId, { member: false, expiresAt: now + membershipCacheTtl(null) });
    return false;
  }
}

export function clearMembershipCache() { cache.clear(); }
