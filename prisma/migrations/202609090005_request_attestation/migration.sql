ALTER TABLE "SponsorshipRequest" ADD COLUMN "attestationAccepted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SponsorshipRequest" ADD COLUMN "attestationAcceptedAt" DATETIME;
