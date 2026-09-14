import { audit } from "@/lib/access";
import { parseDiscordMember, type DiscordMember, type ParsedDiscordMember } from "@/lib/discord-members";
import { prisma } from "@/lib/prisma";

const api = "https://discord.com/api/v10";
const PAGE_SIZE = 1000;
const MAX_RATE_LIMIT_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 5_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Lecture Discord avec reprise bornée sur `429` (respecte `Retry-After`). */
async function fetchWithRetry(url: string, token: string) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, { headers: { Authorization: `Bot ${token}` }, cache: "no-store" });
    if (response.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) return response;
    const retryAfter = Number(response.headers.get("retry-after"));
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * (attempt + 1);
    await sleep(Math.min(delay, MAX_RETRY_DELAY_MS));
  }
}

async function fetchRoleNames(guildId: string, token: string) {
  const response = await fetchWithRetry(`${api}/guilds/${guildId}/roles`, token);
  if (!response.ok) throw new Error(`Discord a refusé la lecture des rôles (${response.status}).`);
  const roles = (await response.json()) as Array<{ id: string; name: string }>;
  return new Map(roles.map((role) => [role.id, role.name]));
}

async function saveMembers(members: ParsedDiscordMember[]) {
  if (!members.length) return;
  await prisma.$transaction(
    members.map((member) =>
      prisma.user.upsert({
        where: { discordId: member.discordId },
        update: {
          username: member.username,
          serverNickname: member.serverNickname,
          joinedAt: member.joinedAt,
          discordRoles: JSON.stringify(member.roles),
        },
        create: {
          discordId: member.discordId,
          username: member.username,
          serverNickname: member.serverNickname,
          joinedAt: member.joinedAt,
          discordRoles: JSON.stringify(member.roles),
        },
      }),
    ),
  );
}

export async function syncDiscordMembers(actorDiscordId: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !guildId) throw new Error("DISCORD_BOT_TOKEN et DISCORD_GUILD_ID sont requis.");

  const roleNames = await fetchRoleNames(guildId, token);
  let after = "0";
  let total = 0;

  for (;;) {
    const response = await fetchWithRetry(`${api}/guilds/${guildId}/members?limit=${PAGE_SIZE}&after=${after}`, token);
    if (!response.ok) throw new Error(`Discord a refusé la synchronisation (${response.status}).`);
    const members = (await response.json()) as DiscordMember[];
    if (!members.length) break;

    const parsed = members.map((member) => parseDiscordMember(member, roleNames)).filter((member): member is ParsedDiscordMember => member !== null);
    await saveMembers(parsed);
    total += parsed.length;

    const lastId = members[members.length - 1].user?.id;
    if (!lastId || members.length < PAGE_SIZE) break;
    after = lastId;
  }

  await audit("DISCORD_MEMBERS_SYNCED", actorDiscordId);
  return total;
}
