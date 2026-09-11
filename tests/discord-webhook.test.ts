import { describe, expect, it, vi } from "vitest";
import { buildAccessRequestWebhookPayload, sendDiscordWebhook } from "../lib/discord-webhook";

describe("webhook des demandes d’accès", () => {
  it("construit un embed avec le pseudo, la date et le lien", () => {
    const payload = buildAccessRequestWebhookPayload({
      requesterName: "Pseudo test",
      createdAt: "2026-09-12T12:34:00.000Z",
      requestUrl: "https://app.example.com/demandes-acces?request=req_test",
    });
    const embed = payload.embeds[0];

    expect(payload.allowed_mentions).toEqual({ parse: [] });
    expect(embed.title).toBe("Nouvelle demande d’accès");
    expect(embed.url).toBe("https://app.example.com/demandes-acces?request=req_test");
    expect(embed.fields).toEqual([
      { name: "Pseudo", value: "Pseudo test", inline: true },
      { name: "Date", value: expect.stringContaining("14:34"), inline: true },
      { name: "Demande", value: "[Ouvrir la demande](https://app.example.com/demandes-acces?request=req_test)" },
    ]);
    expect(embed.timestamp).toBe("2026-09-12T12:34:00.000Z");
  });

  it("envoie le payload au webhook sans authentification Bot", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const payload = buildAccessRequestWebhookPayload({ requesterName: "Pseudo test", createdAt: "2026-09-12T12:34:00.000Z", requestUrl: "https://app.example.com/demandes-acces?request=req_test" });

    const response = await sendDiscordWebhook("https://discord.com/api/webhooks/100000000000000003/synthetic-token", payload, fetcher);

    expect(response.status).toBe(204);
    expect(fetcher).toHaveBeenCalledWith(
      "https://discord.com/api/webhooks/100000000000000003/synthetic-token?wait=true",
      expect.objectContaining({ method: "POST", headers: { "Content-Type": "application/json" } }),
    );
    expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(payload);
  });
});
