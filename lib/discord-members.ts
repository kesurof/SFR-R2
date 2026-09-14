export type DiscordMember = {
  nick?: string | null;
  roles?: string[];
  joined_at?: string | null;
  user?: { id?: string; username?: string; global_name?: string | null };
};

export type ParsedDiscordMember = {
  discordId: string;
  username: string;
  serverNickname: string | null;
  joinedAt: Date | null;
  roles: string[];
};

/** Extrait les champs utiles d'un membre Discord, sans dépendance réseau ni base. */
export function parseDiscordMember(member: DiscordMember, roleNames: Map<string, string>): ParsedDiscordMember | null {
  const id = member.user?.id;
  if (!id) return null;
  return {
    discordId: id,
    username: member.user?.global_name ?? member.user?.username ?? "Discord",
    serverNickname: member.nick ?? null,
    joinedAt: member.joined_at ? new Date(member.joined_at) : null,
    roles: (member.roles ?? []).map((roleId) => roleNames.get(roleId)).filter((name): name is string => Boolean(name)),
  };
}
