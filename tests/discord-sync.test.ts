import { describe, expect, it } from "vitest";
import { parseDiscordMember } from "../lib/discord-members";

const roles = new Map([
  ["role_admin", "Admin"],
  ["role_member", "Membre"],
]);

describe("normalisation d'un membre Discord", () => {
  it("extrait les champs utiles et traduit les rôles connus", () => {
    const parsed = parseDiscordMember(
      {
        nick: "Pseudo serveur",
        roles: ["role_admin", "role_inconnu"],
        joined_at: "2024-01-02T03:04:05.000Z",
        user: { id: "123", username: "discord_user", global_name: "Nom global" },
      },
      roles,
    );

    expect(parsed).toEqual({
      discordId: "123",
      username: "Nom global",
      serverNickname: "Pseudo serveur",
      joinedAt: new Date("2024-01-02T03:04:05.000Z"),
      roles: ["Admin"],
    });
  });

  it("retombe sur le nom d'utilisateur sans nom global", () => {
    const parsed = parseDiscordMember({ user: { id: "456", username: "discord_user" } }, roles);
    expect(parsed?.username).toBe("discord_user");
    expect(parsed?.serverNickname).toBeNull();
    expect(parsed?.joinedAt).toBeNull();
    expect(parsed?.roles).toEqual([]);
  });

  it("ignore un membre sans identifiant", () => {
    expect(parseDiscordMember({ user: {} }, roles)).toBeNull();
    expect(parseDiscordMember({}, roles)).toBeNull();
  });
});
