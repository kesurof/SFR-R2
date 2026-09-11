export const ACCESS_REQUEST_WEBHOOK_TARGET = "access-request-webhook";

type AccessRequestWebhookInput = {
  requesterName: string;
  createdAt: Date | string;
  requestUrl: string;
};

export type DiscordWebhookPayload = {
  username: string;
  embeds: Array<{
    title: string;
    url: string;
    color: number;
    fields: Array<{ name: string; value: string; inline?: boolean }>;
    timestamp: string;
  }>;
  allowed_mentions: { parse: [] };
};

const escapeMarkdown = (value: string) => value.replace(/[\\`*_~|]/g, "\\$&");

export function buildAccessRequestWebhookPayload({ requesterName, createdAt, requestUrl }: AccessRequestWebhookInput): DiscordWebhookPayload {
  const date = new Date(createdAt);
  return {
    username: "Demandes d’accès",
    embeds: [
      {
        title: "Nouvelle demande d’accès",
        url: requestUrl,
        color: 0x5865f2,
        fields: [
          { name: "Pseudo", value: escapeMarkdown(requesterName.trim() || "Inconnu"), inline: true },
          {
            name: "Date",
            value: new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(date),
            inline: true,
          },
          { name: "Demande", value: `[Ouvrir la demande](${requestUrl})` },
        ],
        timestamp: date.toISOString(),
      },
    ],
    allowed_mentions: { parse: [] },
  };
}

type WebhookFetcher = (url: string, init: RequestInit) => Promise<Response>;

export function sendDiscordWebhook(webhookUrl: string, payload: DiscordWebhookPayload, fetcher: WebhookFetcher = fetch) {
  const separator = webhookUrl.includes("?") ? "&" : "?";
  return fetcher(`${webhookUrl}${separator}wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
