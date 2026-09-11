ALTER TABLE "DiscordNotification" RENAME COLUMN "recipientDiscordId" TO "targetId";
ALTER TABLE "DiscordNotification" ADD COLUMN "targetKind" TEXT NOT NULL DEFAULT 'DM';
ALTER TABLE "DiscordNotification" ADD COLUMN "accessRequestId" TEXT;
CREATE INDEX "DiscordNotification_accessRequestId_idx" ON "DiscordNotification"("accessRequestId");

CREATE TABLE "AccessApproverPermission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "grantedByDiscordId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessApproverPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AccessApproverPermission_userId_key" ON "AccessApproverPermission"("userId");

CREATE TABLE "AccessRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "requesterId" TEXT NOT NULL,
  "communitiesAndTrackers" TEXT NOT NULL,
  "motivations" TEXT NOT NULL,
  "selfHostingExperience" TEXT NOT NULL,
  "discoverySource" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "decidedByDiscordId" TEXT,
  "decidedAt" DATETIME,
  "decisionComment" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccessRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AccessRequest_status_idx" ON "AccessRequest"("status");
CREATE INDEX "AccessRequest_requesterId_idx" ON "AccessRequest"("requesterId");
CREATE UNIQUE INDEX "one_pending_access_request_per_requester" ON "AccessRequest"("requesterId") WHERE "status" = 'PENDING';
