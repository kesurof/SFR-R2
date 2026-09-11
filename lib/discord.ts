import { ensureUser, audit } from "@/lib/access";
import { prisma } from "@/lib/prisma";

const api = "https://discord.com/api/v10";
export async function syncDiscordMembers(actorDiscordId: string) {
  const token = process.env.DISCORD_BOT_TOKEN; const guildId = process.env.DISCORD_GUILD_ID; if (!token || !guildId) throw new Error("DISCORD_BOT_TOKEN et DISCORD_GUILD_ID sont requis.");
  const roleResponse = await fetch(`${api}/guilds/${guildId}/roles`, { headers: { Authorization: `Bot ${token}` }, cache: "no-store" });
  if (!roleResponse.ok) throw new Error(`Discord a refusé la lecture des rôles (${roleResponse.status}).`);
  const roles = await roleResponse.json() as Array<{ id: string; name: string }>;
  const roleNames = new Map(roles.map(role => [role.id, role.name]));
  let after = "0"; let total = 0;
  for (;;) { const response = await fetch(`${api}/guilds/${guildId}/members?limit=1000&after=${after}`, { headers: { Authorization: `Bot ${token}` }, cache: "no-store" }); if (!response.ok) throw new Error(`Discord a refusé la synchronisation (${response.status}).`); const members = await response.json() as Array<{ nick?: string | null; roles?: string[]; joined_at?: string | null; user?: { id: string; username?: string; global_name?: string | null } }>; if (!members.length) break; for (const member of members) { if (member.user?.id) { const name = member.user.global_name ?? member.user.username ?? "Discord"; const user = await ensureUser(member.user.id, name); await prisma.user.update({ where: { id: user.id }, data: { username: name, serverNickname: member.nick ?? null, joinedAt: member.joined_at ? new Date(member.joined_at) : null, discordRoles: JSON.stringify((member.roles ?? []).map(id => roleNames.get(id)).filter((name): name is string => Boolean(name))) } }); total++; after = member.user.id; } } if (members.length < 1000) break; }
  await audit("DISCORD_MEMBERS_SYNCED", actorDiscordId); return total;
}
