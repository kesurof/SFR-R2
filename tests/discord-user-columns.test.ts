import { describe, expect, it } from "vitest";
import { collectDiscordRoles, compareDiscordUsers, matchesDiscordUserFilters, parseDiscordRoles, type DiscordUserTableRow } from "../lib/discord-user-columns";

const user = (overrides: Partial<DiscordUserTableRow> = {}): DiscordUserTableRow => ({
  serverNickname: "Pseudo",
  username: "Utilisateur",
  discordId: "250000000000000001",
  discordRoles: JSON.stringify(["Membres"]),
  joinedAt: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

describe("colonnes utilisateur Discord", () => {
  it("parse les rôles invalides sans faire échouer la vue", () => {
    expect(parseDiscordRoles("not-json")).toEqual([]);
    expect(parseDiscordRoles(JSON.stringify(["Membres", 42, null]))).toEqual(["Membres"]);
  });

  it("collecte les rôles uniques dans un ordre stable", () => {
    expect(collectDiscordRoles([user(), user({ discordRoles: JSON.stringify(["Contributeurs", "Membres"]) })])).toEqual(["Contributeurs", "Membres"]);
  });

  it("filtre le pseudo, le nom, l'identifiant et les utilisateurs sans rôle", () => {
    expect(matchesDiscordUserFilters(user(), { nickname: "seud", username: "isateur", discordId: "0001", role: "Membres" })).toBe(true);
    expect(matchesDiscordUserFilters(user(), { nickname: "", username: "", discordId: "", role: "__none" })).toBe(false);
    expect(matchesDiscordUserFilters(user({ discordRoles: "[]" }), { nickname: "", username: "", discordId: "", role: "__none" })).toBe(true);
  });

  it("trie les dates d'adhésion avec les dates inconnues en dernier", () => {
    const older = user({ joinedAt: "2024-01-01T00:00:00.000Z" });
    const newer = user({ joinedAt: "2026-01-01T00:00:00.000Z" });
    const unknown = user({ joinedAt: null });
    expect(compareDiscordUsers(older, newer, "server", "asc")).toBeLessThan(0);
    expect(compareDiscordUsers(older, newer, "server", "desc")).toBeGreaterThan(0);
    expect(compareDiscordUsers(unknown, older, "server", "asc")).toBeGreaterThan(0);
    expect(compareDiscordUsers(unknown, older, "server", "desc")).toBeGreaterThan(0);
  });
});
