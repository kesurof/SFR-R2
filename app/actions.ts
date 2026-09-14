"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, ensureUser, identity, requireAdmin, requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { decideRequest, issueClaim, revokeKey, saveKey, submitRequest } from "@/lib/workflow";
import { discardPendingNotifications, queueNotification, wakeNotificationWorker } from "@/lib/discord-notifications";
import { getNotificationSettings, parseNotificationSettingsInput } from "@/lib/settings";
import { decideAccessRequest, saveAccessRequestKey, submitAccessRequest } from "@/lib/access-request-workflow";
import { rejectKeyReplacement, replaceKey, replaceKeyById, requestKeyReplacement } from "@/lib/key-replacement-workflow";
import { restoreManualAccess } from "@/lib/manual-access-workflow";
import {
  accessRequestDecisionSchema,
  accessRequestFormSchema,
  keyIdSchema,
  keyReplacementRequestSchema,
  manualAccessFormSchema,
  notificationSettingsSchema,
  permissionActionSchema,
  rejectKeyReplacementSchema,
  replaceKeyByIdSchema,
  replaceKeySchema,
  requestIdSchema,
  sponsorshipDecisionSchema,
  sponsorshipFormSchema,
  storeKeySchema,
} from "@/lib/action-schemas";
import { adminAction, approverAction, errorMessage, formAction, memberAction } from "@/lib/safe-action";

const adminNoticeUrl = (code: string, view = "requests") => `/admin?view=${view}&notice=${encodeURIComponent(code)}`;
const adminRedirect = (code: string, view = "requests") => redirect(adminNoticeUrl(code, view));
const validationError = (result: { validationErrors?: unknown }) => Boolean(result.validationErrors);

export const createSponsorship = formAction(
  memberAction.inputSchema(sponsorshipFormSchema).action(async ({ parsedInput, ctx }) => {
    await submitRequest(ctx.actor, {
      referredIdentifier: parsedInput.discordId,
      relationship: parsedInput.relationship,
      knownSince: parsedInput.knownSince,
      context: parsedInput.context,
      comment: parsedInput.comment || undefined,
      attestationAccepted: parsedInput.attestationAccepted,
    });
    revalidatePath("/parrainer");
    redirect("/parrainer?success=1");
  }),
  (result) => `/parrainer?error=${encodeURIComponent(errorMessage(result, "Impossible de créer la demande."))}`,
);

export const decide = formAction(
  adminAction.inputSchema(sponsorshipDecisionSchema).action(async ({ parsedInput, ctx }) => {
    const approved = parsedInput.decision === "approve";
    await decideRequest(parsedInput.requestId, ctx.actor.discordId, approved, parsedInput.rejectionReason);
    revalidatePath("/admin");
    adminRedirect(approved ? "request_approved" : "request_rejected");
  }),
  (result) => adminNoticeUrl(validationError(result) ? "rejection_reason_required" : "decision_error"),
);

export const archiveRequest = formAction(
  adminAction.inputSchema(requestIdSchema).action(async ({ parsedInput, ctx }) => {
    const before = await prisma.sponsorshipRequest.findUnique({ where: { id: parsedInput.requestId }, select: { status: true } });
    const request = await prisma.sponsorshipRequest.update({ where: { id: parsedInput.requestId }, data: { status: "ARCHIVED" } });
    await audit("SPONSOR_REQUEST_ARCHIVED", ctx.actor.discordId, undefined, request.id, undefined, { previousStatus: before?.status, newStatus: "ARCHIVED" });
    revalidatePath("/admin");
    adminRedirect("request_archived");
  }),
  () => adminNoticeUrl("archive_error"),
);

export const deleteRequest = formAction(
  adminAction.inputSchema(requestIdSchema).action(async ({ parsedInput, ctx }) => {
    await audit("SPONSOR_REQUEST_DELETED", ctx.actor.discordId, undefined, parsedInput.requestId, undefined, { result: "success" });
    await prisma.sponsorshipRequest.delete({ where: { id: parsedInput.requestId } });
    revalidatePath("/admin");
    adminRedirect("request_deleted");
  }),
  () => adminNoticeUrl("delete_error"),
);

export const setSponsor = formAction(
  adminAction.inputSchema(permissionActionSchema).action(async ({ parsedInput, ctx }) => {
    const user = await ensureUser(parsedInput.discordId, parsedInput.discordId);
    if (parsedInput.action === "grant") {
      await prisma.sponsorPermission.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, grantedByDiscordId: ctx.actor.discordId } });
      await audit("SPONSOR_PERMISSION_GRANTED", ctx.actor.discordId, parsedInput.discordId, undefined, undefined, { result: "success" });
      await queueNotification({ type: "SPONSOR_GRANTED", recipientDiscordId: parsedInput.discordId, dedupeKey: `sponsor-granted:${parsedInput.discordId}`, message: "Le droit de parrainer vous a été accordé." });
    } else {
      await prisma.sponsorPermission.deleteMany({ where: { userId: user.id } });
      await audit("SPONSOR_PERMISSION_REVOKED", ctx.actor.discordId, parsedInput.discordId, undefined, undefined, { result: "success" });
      await queueNotification({ type: "SPONSOR_REVOKED", recipientDiscordId: parsedInput.discordId, dedupeKey: `sponsor-revoked:${parsedInput.discordId}`, message: "Votre droit de parrainer a été retiré." });
    }
    revalidatePath("/admin");
    adminRedirect(parsedInput.action === "grant" ? "sponsor_granted" : "sponsor_revoked", "users");
  }),
  (result) => adminNoticeUrl(validationError(result) ? "sponsor_invalid" : "sponsor_error", "users"),
);

export const storeKey = formAction(
  adminAction.inputSchema(storeKeySchema).action(async ({ parsedInput, ctx }) => {
    await saveKey(parsedInput.requestId, parsedInput.secret, ctx.actor.discordId);
    revalidatePath("/admin");
    adminRedirect("key_saved");
  }),
  () => adminNoticeUrl("key_error"),
);

export const revoke = formAction(
  adminAction.inputSchema(keyIdSchema).action(async ({ parsedInput, ctx }) => {
    await revokeKey(parsedInput.keyId, ctx.actor.discordId);
    revalidatePath("/admin");
    adminRedirect("key_revoked", "keys");
  }),
  () => adminNoticeUrl("key_revoke_error", "keys"),
);

export const requestKeyReplacementAction = formAction(
  memberAction.inputSchema(keyReplacementRequestSchema).action(async ({ parsedInput, ctx }) => {
    await requestKeyReplacement(ctx.actor, parsedInput.reason);
    revalidatePath("/mon-acces");
    redirect("/mon-acces?notice=key_replacement_requested");
  }),
  (result) => `/mon-acces?error=${encodeURIComponent(errorMessage(result, "Impossible d’envoyer la demande de remplacement."))}`,
);

export const replaceKeyAction = formAction(
  adminAction.inputSchema(replaceKeySchema).action(async ({ parsedInput, ctx }) => {
    await replaceKey(parsedInput.replacementRequestId, parsedInput.secret, ctx.actor.discordId);
    revalidatePath("/admin");
    revalidatePath("/mon-acces");
    adminRedirect("key_replaced", "keys");
  }),
  () => adminNoticeUrl("key_replacement_error", "keys"),
);

export const replaceKeyByIdAction = formAction(
  adminAction.inputSchema(replaceKeyByIdSchema).action(async ({ parsedInput, ctx }) => {
    await replaceKeyById(parsedInput.keyId, parsedInput.secret, ctx.actor.discordId);
    revalidatePath("/admin");
    revalidatePath("/mon-acces");
    adminRedirect("key_replaced", "keys");
  }),
  () => adminNoticeUrl("key_replacement_error", "keys"),
);

export const rejectKeyReplacementAction = formAction(
  adminAction.inputSchema(rejectKeyReplacementSchema).action(async ({ parsedInput, ctx }) => {
    await rejectKeyReplacement(parsedInput.replacementRequestId, parsedInput.decisionComment, ctx.actor.discordId);
    revalidatePath("/admin");
    revalidatePath("/mon-acces");
    adminRedirect("key_replacement_rejected", "keys");
  }),
  (result) => adminNoticeUrl(validationError(result) ? "key_replacement_reason_required" : "key_replacement_error", "keys"),
);

export const updateNotificationSettings = formAction(
  adminAction.inputSchema(notificationSettingsSchema).action(async ({ parsedInput, ctx }) => {
    const current = await getNotificationSettings();
    const stored = await prisma.appSettings.findUnique({ where: { id: "global" }, select: { accessRequestWebhookEncrypted: true } });
    const parsed = parseNotificationSettingsInput(parsedInput.discordNotificationsEnabled, parsedInput.notificationWorkerIntervalSeconds, parsedInput.accessRequestWebhookUrl);
    const webhookEncrypted = parsed.accessRequestWebhookUrl ? encrypt(parsed.accessRequestWebhookUrl) : stored?.accessRequestWebhookEncrypted ?? null;
    const next = { discordNotificationsEnabled: parsed.discordNotificationsEnabled, notificationWorkerIntervalSeconds: parsed.notificationWorkerIntervalSeconds, accessRequestWebhookEncrypted: webhookEncrypted };
    try {
      await prisma.appSettings.upsert({ where: { id: "global" }, update: { ...next, updatedByDiscordId: ctx.actor.discordId }, create: { id: "global", ...next, updatedByDiscordId: ctx.actor.discordId } });
      const discardedPending = next.discordNotificationsEnabled ? 0 : await discardPendingNotifications();
      await audit("NOTIFICATION_SETTINGS_UPDATED", ctx.actor.discordId, undefined, undefined, undefined, {
        previous: { discordNotificationsEnabled: current.discordNotificationsEnabled, notificationWorkerIntervalSeconds: current.notificationWorkerIntervalSeconds, accessRequestWebhookConfigured: current.accessRequestWebhookConfigured },
        next: { discordNotificationsEnabled: next.discordNotificationsEnabled, notificationWorkerIntervalSeconds: next.notificationWorkerIntervalSeconds, accessRequestWebhookConfigured: Boolean(next.accessRequestWebhookEncrypted) },
        discardedPendingNotifications: discardedPending,
        result: "success",
      });
      wakeNotificationWorker();
    } catch (error) {
      const reason = error instanceof Error && error.message.startsWith("L'intervalle") ? "INVALID_INTERVAL" : error instanceof Error && error.message.startsWith("L’URL") ? "INVALID_WEBHOOK" : "UPDATE_FAILED";
      try { await audit("NOTIFICATION_SETTINGS_UPDATE_FAILED", ctx.actor.discordId, undefined, undefined, undefined, { result: "error", reason }); } catch { /* ne masque pas l'erreur utilisateur */ }
      adminRedirect("settings_error", "settings");
    }
    revalidatePath("/admin");
    adminRedirect("settings_saved", "settings");
  }),
  () => adminNoticeUrl("settings_error", "settings"),
);

export async function createClaim() {
  const actor = await identity();
  await issueClaim(actor.discordId);
  revalidatePath("/mon-acces");
}

export async function clearAccessRequestWebhook() {
  const actor = await requireAdmin();
  try {
    const current = await getNotificationSettings();
    await prisma.appSettings.update({ where: { id: "global" }, data: { accessRequestWebhookEncrypted: null, updatedByDiscordId: actor.discordId } });
    await prisma.discordNotification.updateMany({ where: { targetKind: "WEBHOOK", status: "PENDING" }, data: { status: "FAILED", lastErrorCode: "WEBHOOK_DISABLED", nextAttemptAt: null } });
    await audit("NOTIFICATION_WEBHOOK_CLEARED", actor.discordId, undefined, undefined, undefined, { previousConfigured: current.accessRequestWebhookConfigured, result: "success" });
    wakeNotificationWorker();
  } catch {
    try { await audit("NOTIFICATION_WEBHOOK_CLEAR_FAILED", actor.discordId, undefined, undefined, undefined, { result: "error" }); } catch { /* ne masque pas l'erreur utilisateur */ }
    adminRedirect("settings_error", "settings");
  }
  revalidatePath("/admin");
  adminRedirect("webhook_cleared", "settings");
}

const accessRequestNoticeUrl = (code: string) => `/demandes-acces?notice=${encodeURIComponent(code)}`;

export const createAccessRequest = formAction(
  memberAction.inputSchema(accessRequestFormSchema).action(async ({ parsedInput, ctx }) => {
    await submitAccessRequest(ctx.actor, {
      communitiesAndTrackers: parsedInput.communitiesAndTrackers,
      motivations: parsedInput.motivations,
      selfHostingExperience: parsedInput.selfHostingExperience,
      discoverySource: parsedInput.discoverySource,
    });
    revalidatePath("/demande-acces");
    redirect("/demande-acces?success=1");
  }),
  (result) => `/demande-acces?error=${encodeURIComponent(errorMessage(result, "Impossible d’envoyer la demande."))}`,
);

export const decideAccessRequestAction = formAction(
  approverAction.inputSchema(accessRequestDecisionSchema).action(async ({ parsedInput, ctx }) => {
    const approved = parsedInput.decision === "approve";
    await decideAccessRequest(parsedInput.requestId, ctx.actor.discordId, approved, parsedInput.decisionComment);
    revalidatePath("/demandes-acces");
    revalidatePath("/demande-acces");
    redirect(accessRequestNoticeUrl(approved ? "access_request_approved" : "access_request_rejected"));
  }),
  () => accessRequestNoticeUrl("access_request_error"),
);

export const storeAccessRequestKey = formAction(
  adminAction.inputSchema(storeKeySchema).action(async ({ parsedInput, ctx }) => {
    await saveAccessRequestKey(parsedInput.requestId, parsedInput.secret, ctx.actor.discordId);
    revalidatePath("/demandes-acces");
    revalidatePath("/demande-acces");
    redirect(accessRequestNoticeUrl("access_request_key_saved"));
  }),
  () => accessRequestNoticeUrl("access_request_key_error"),
);

export const setAccessApprover = formAction(
  adminAction.inputSchema(permissionActionSchema).action(async ({ parsedInput, ctx }) => {
    const user = await ensureUser(parsedInput.discordId, parsedInput.discordId);
    if (parsedInput.action === "grant") {
      await prisma.accessApproverPermission.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, grantedByDiscordId: ctx.actor.discordId } });
      await audit("ACCESS_APPROVER_GRANTED", ctx.actor.discordId, parsedInput.discordId);
    } else {
      await prisma.accessApproverPermission.deleteMany({ where: { userId: user.id } });
      await audit("ACCESS_APPROVER_REVOKED", ctx.actor.discordId, parsedInput.discordId);
    }
    revalidatePath("/admin");
    adminRedirect(parsedInput.action === "grant" ? "approver_granted" : "approver_revoked", "users");
  }),
  (result) => adminNoticeUrl(validationError(result) ? "approver_invalid" : "approver_error", "users"),
);

export const restoreManualAccessAction = formAction(
  adminAction.inputSchema(manualAccessFormSchema).action(async ({ parsedInput, ctx }) => {
    await restoreManualAccess(
      {
        discordId: parsedInput.discordId,
        username: parsedInput.username,
        secret: parsedInput.secret,
      },
      ctx.actor.discordId,
    );
    revalidatePath("/admin");
    redirect("/admin?view=restore&notice=manual_access_restored");
  }),
  (result) => `/admin?view=restore&error=${encodeURIComponent(errorMessage(result, "Impossible de restaurer cet accès."))}`,
);
