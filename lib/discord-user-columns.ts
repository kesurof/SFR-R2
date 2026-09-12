import { accountCreatedAt } from "@/lib/member-age";

export type DiscordUserTableRow = {
  serverNickname: string | null;
  username: string;
  discordId: string;
  discordRoles: string;
  joinedAt: Date | string | null;
};

export type DiscordUserColumnFilters = {
  nickname: string;
  username: string;
  discordId: string;
  role: string;
};

export type DiscordUserSortKey = "server" | "account";
export type SortDirection = "asc" | "desc";

export const DEFAULT_DISCORD_USER_FILTERS: DiscordUserColumnFilters = {
  nickname: "",
  username: "",
  discordId: "",
  role: "",
};

export function parseDiscordRoles(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((role): role is string => typeof role === "string") : [];
  } catch {
    return [];
  }
}

export function collectDiscordRoles(rows: DiscordUserTableRow[]): string[] {
  const roles = new Set<string>();
  rows.forEach((row) => parseDiscordRoles(row.discordRoles).forEach((role) => roles.add(role)));
  return [...roles].sort((a, b) => a.localeCompare(b, "fr"));
}

export function matchesDiscordUserFilters(row: DiscordUserTableRow, filters: DiscordUserColumnFilters): boolean {
  const nickname = filters.nickname.trim().toLocaleLowerCase();
  const username = filters.username.trim().toLocaleLowerCase();
  const discordId = filters.discordId.trim().toLocaleLowerCase();
  const roles = parseDiscordRoles(row.discordRoles);
  const rowNickname = (row.serverNickname ?? "").toLocaleLowerCase();

  if (nickname && !rowNickname.includes(nickname)) return false;
  if (username && !row.username.toLocaleLowerCase().includes(username)) return false;
  if (discordId && !row.discordId.toLocaleLowerCase().includes(discordId)) return false;
  if (filters.role === "__none" && roles.length > 0) return false;
  if (filters.role && filters.role !== "__none" && !roles.includes(filters.role)) return false;
  return true;
}

function dateValue(row: DiscordUserTableRow, key: DiscordUserSortKey): number | null {
  const date = key === "server"
    ? (row.joinedAt ? new Date(row.joinedAt) : null)
    : accountCreatedAt(row.discordId);
  return date ? date.getTime() : null;
}

export function compareDiscordUsers(a: DiscordUserTableRow, b: DiscordUserTableRow, key: DiscordUserSortKey, direction: SortDirection): number {
  const left = dateValue(a, key);
  const right = dateValue(b, key);
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return (left - right) * (direction === "asc" ? 1 : -1);
}
