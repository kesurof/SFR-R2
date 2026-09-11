import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearMembershipCache, isDiscordMember } from "../lib/membership";

describe("appartenance Discord dynamique", () => {
  beforeEach(() => {
    clearMembershipCache();
    process.env.DISCORD_BOT_TOKEN = "bot";
    process.env.DISCORD_GUILD_ID = "guild";
    vi.restoreAllMocks();
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
});
