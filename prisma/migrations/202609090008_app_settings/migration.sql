CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "discordNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationWorkerIntervalSeconds" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedByDiscordId" TEXT
);
