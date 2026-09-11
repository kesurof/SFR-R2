-- Le texte du DM est persisté : le chemin d'envoi immédiat et le worker envoient
-- désormais exactement le même contenu.
ALTER TABLE "DiscordNotification" ADD COLUMN "message" TEXT NOT NULL DEFAULT '';
-- Backoff des tentatives et reprise des envois interrompus.
ALTER TABLE "DiscordNotification" ADD COLUMN "nextAttemptAt" DATETIME;
DROP INDEX IF EXISTS "DiscordNotification_status_createdAt_idx";
CREATE INDEX "DiscordNotification_status_nextAttemptAt_idx" ON "DiscordNotification"("status", "nextAttemptAt");

-- Motif de refus lisible, au lieu d'être enfoui dans les métadonnées d'audit.
ALTER TABLE "SponsorshipRequest" ADD COLUMN "rejectionReason" TEXT;
