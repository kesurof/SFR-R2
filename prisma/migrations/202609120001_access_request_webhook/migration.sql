-- Les anciennes alertes de salon ne doivent plus partir après le remplacement
-- du canal par le webhook.
UPDATE "DiscordNotification"
SET "status" = 'FAILED',
    "lastErrorCode" = 'CHANNEL_NOTIFICATION_DISABLED',
    "nextAttemptAt" = NULL
WHERE "targetKind" = 'CHANNEL'
  AND "type" = 'ACCESS_REQUEST_REVIEW'
  AND "status" IN ('PENDING', 'SENDING');

ALTER TABLE "AppSettings" DROP COLUMN "accessRequestChannelId";
ALTER TABLE "AppSettings" ADD COLUMN "accessRequestWebhookEncrypted" TEXT;
