import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearMembershipCache, isDiscordMember, membershipCacheTtl } from "../lib/membership";

describe("appartenance Discord dynamique", () => {
  beforeEach(() => {
    clearMembershipCache();
    process.env.DISCORD_BOT_TOKEN = "bot";
    process.env.DISCORD_GUILD_ID = "guild";
    vi.restoreAllMocks();
  });

  it("mémorise plus longtemps un résultat définitif qu'une erreur transitoire", () => {
    expect(membershipCacheTtl(200)).toBe(60_000);
    expect(membershipCacheTtl(404)).toBe(60_000);
    expect(membershipCacheTtl(429)).toBe(5_000);
    expect(membershipCacheTtl(500)).toBe(5_000);
    expect(membershipCacheTtl(null)).toBe(5_000);
  });

  it("accepte un membre et réutilise le cache court", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await isDiscordMember("123")).toBe(true);
    expect(await isDiscordMember("123")).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("refuse un membre absent ou une API indisponible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));
    expect(await isDiscordMember("456")).toBe(false);
    clearMembershipCache();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await isDiscordMember("456")).toBe(false);
  });
  it("rejette une réponse Discord en erreur (429) en fail-closed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 429 })));
    expect(await isDiscordMember("789")).toBe(false);
  });
});
