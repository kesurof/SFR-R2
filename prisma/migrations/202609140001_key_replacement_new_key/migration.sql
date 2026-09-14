-- Trace la nouvelle clé issue d'un remplacement réussi : la colonne « Remplacement »
-- peut ainsi rattacher la demande à la clé active qui l'a produite.
-- SQLite impose de reconstruire la table pour ajouter la clé étrangère.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_KeyReplacementRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "currentKeyId" TEXT NOT NULL,
    "newKeyId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedByDiscordId" TEXT,
    "decidedAt" DATETIME,
    "decisionComment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KeyReplacementRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KeyReplacementRequest_currentKeyId_fkey" FOREIGN KEY ("currentKeyId") REFERENCES "AccessKey" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "KeyReplacementRequest_newKeyId_fkey" FOREIGN KEY ("newKeyId") REFERENCES "AccessKey" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_KeyReplacementRequest" ("createdAt", "currentKeyId", "decidedAt", "decidedByDiscordId", "decisionComment", "id", "reason", "status", "updatedAt", "userId") SELECT "createdAt", "currentKeyId", "decidedAt", "decidedByDiscordId", "decisionComment", "id", "reason", "status", "updatedAt", "userId" FROM "KeyReplacementRequest";
DROP TABLE "KeyReplacementRequest";
ALTER TABLE "new_KeyReplacementRequest" RENAME TO "KeyReplacementRequest";
CREATE UNIQUE INDEX "KeyReplacementRequest_newKeyId_key" ON "KeyReplacementRequest"("newKeyId");
CREATE INDEX "KeyReplacementRequest_status_idx" ON "KeyReplacementRequest"("status");
CREATE INDEX "KeyReplacementRequest_userId_status_idx" ON "KeyReplacementRequest"("userId", "status");
CREATE INDEX "KeyReplacementRequest_currentKeyId_idx" ON "KeyReplacementRequest"("currentKeyId");
-- Index partiel non représentable dans le schéma Prisma : à recréer après la reconstruction.
CREATE UNIQUE INDEX "one_pending_key_replacement_per_user" ON "KeyReplacementRequest"("userId") WHERE "status" = 'PENDING';
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
