ALTER TABLE "DiscordNotification" ADD COLUMN "replacementRequestId" TEXT;
CREATE INDEX "DiscordNotification_replacementRequestId_idx" ON "DiscordNotification"("replacementRequestId");

ALTER TABLE "AuditLog" ADD COLUMN "replacementRequestId" TEXT;
CREATE INDEX "AuditLog_replacementRequestId_idx" ON "AuditLog"("replacementRequestId");

CREATE TABLE "KeyReplacementRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "currentKeyId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "decidedByDiscordId" TEXT,
  "decidedAt" DATETIME,
  "decisionComment" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KeyReplacementRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KeyReplacementRequest_currentKeyId_fkey" FOREIGN KEY ("currentKeyId") REFERENCES "AccessKey" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "KeyReplacementRequest_status_idx" ON "KeyReplacementRequest"("status");
CREATE INDEX "KeyReplacementRequest_userId_status_idx" ON "KeyReplacementRequest"("userId", "status");
CREATE INDEX "KeyReplacementRequest_currentKeyId_idx" ON "KeyReplacementRequest"("currentKeyId");
CREATE UNIQUE INDEX "one_pending_key_replacement_per_user" ON "KeyReplacementRequest"("userId") WHERE "status" = 'PENDING';
