// Schémas de validation des entrées de Server Actions.
// Ils décrivent la forme des `FormData` et délèguent les règles métier aux
// fonctions pures de `lib/*-rules.ts` (source de vérité unique).

import { z } from "zod/v4";
import { zfd } from "zod-form-data";
import { accessKeySecretError } from "@/lib/access-key-rules";
import { accessRequestDecisionError, accessRequestInputError } from "@/lib/access-request-rules";
import { keyReplacementDecisionError, keyReplacementInputError } from "@/lib/key-replacement-rules";
import { manualAccessInputError } from "@/lib/manual-access-rules";
import { parseNotificationSettingsInput } from "@/lib/settings";
import { rejectionReasonError } from "@/lib/workflow-rules";

const trimmed = (max?: number) => {
  const base = z.string().trim();
  return max ? base.max(max) : base;
};

export const DISCORD_ID_PATTERN = /^\d{17,20}$/;

const addBusinessIssue = (ctx: { addIssue: (issue: { code: "custom"; message: string }) => void }, error: string | null) => {
  if (error) ctx.addIssue({ code: "custom", message: error });
};

export const sponsorshipFormSchema = zfd.formData({
  discordId: zfd.text(trimmed()),
  relationship: zfd.text(trimmed(160)),
  knownSince: zfd.text(trimmed(100)),
  context: zfd.text(trimmed(1000)),
  comment: zfd.text(z.string().trim().max(1000).optional()),
  attestationAccepted: zfd.checkbox({ trueValue: "true" }),
});

export const sponsorshipDecisionSchema = zfd.formData({
  requestId: zfd.text(trimmed()),
  decision: zfd.text(z.string()),
  rejectionReason: zfd.text(z.string().trim().max(500).optional()),
}).superRefine((value, ctx) => addBusinessIssue(ctx, rejectionReasonError(value.decision === "approve", value.rejectionReason)));

export const storeKeySchema = zfd.formData({
  requestId: zfd.text(trimmed()),
  secret: zfd.text(z.string()),
}).superRefine((value, ctx) => addBusinessIssue(ctx, accessKeySecretError(value.secret)));

export const requestIdSchema = zfd.formData({
  requestId: zfd.text(trimmed()),
});

export const keyIdSchema = zfd.formData({
  keyId: zfd.text(trimmed()),
});

export const permissionActionSchema = zfd.formData({
  discordId: zfd.text(z.string().trim().regex(DISCORD_ID_PATTERN, "Discord ID invalide : 17 à 20 chiffres attendus.")),
  action: zfd.text(z.string()),
});

export const accessRequestFormSchema = zfd.formData({
  communitiesAndTrackers: zfd.text(trimmed()),
  motivations: zfd.text(trimmed()),
  selfHostingExperience: zfd.text(trimmed()),
  discoverySource: zfd.text(z.string().trim().optional()),
}).superRefine((value, ctx) =>
  addBusinessIssue(
    ctx,
    accessRequestInputError({
      communitiesAndTrackers: value.communitiesAndTrackers,
      motivations: value.motivations,
      selfHostingExperience: value.selfHostingExperience,
      discoverySource: value.discoverySource,
    }),
  ),
);

export const accessRequestDecisionSchema = zfd.formData({
  requestId: zfd.text(trimmed()),
  decision: zfd.text(z.string()),
  decisionComment: zfd.text(z.string().trim().optional()),
}).superRefine((value, ctx) => addBusinessIssue(ctx, accessRequestDecisionError(value.decision === "approve", value.decisionComment)));

export const keyReplacementRequestSchema = zfd.formData({
  reason: zfd.text(z.string().trim()),
}).superRefine((value, ctx) => addBusinessIssue(ctx, keyReplacementInputError(value.reason)));

export const replaceKeySchema = zfd.formData({
  replacementRequestId: zfd.text(trimmed()),
  secret: zfd.text(z.string()),
}).superRefine((value, ctx) => addBusinessIssue(ctx, accessKeySecretError(value.secret)));

export const rejectKeyReplacementSchema = zfd.formData({
  replacementRequestId: zfd.text(trimmed()),
  decisionComment: zfd.text(z.string().trim()),
}).superRefine((value, ctx) => addBusinessIssue(ctx, keyReplacementDecisionError(value.decisionComment)));

export const manualAccessFormSchema = zfd.formData({
  discordId: zfd.text(z.string().trim()),
  username: zfd.text(z.string().trim()),
  serverNickname: zfd.text(z.string().trim().optional()),
  secret: zfd.text(z.string()),
}).superRefine((value, ctx) =>
  addBusinessIssue(
    ctx,
    manualAccessInputError({
      discordId: value.discordId,
      username: value.username,
      serverNickname: value.serverNickname,
      secret: value.secret,
    }),
  ),
);

export const notificationSettingsSchema = zfd.formData({
  discordNotificationsEnabled: zfd.checkbox({ trueValue: "true" }),
  notificationWorkerIntervalSeconds: zfd.text(z.string()),
  accessRequestWebhookUrl: zfd.text(z.string().trim().optional()),
}).superRefine((value, ctx) => {
  try {
    parseNotificationSettingsInput(value.discordNotificationsEnabled, value.notificationWorkerIntervalSeconds, value.accessRequestWebhookUrl);
  } catch (error) {
    addBusinessIssue(ctx, error instanceof Error ? error.message : "Configuration invalide.");
  }
});
