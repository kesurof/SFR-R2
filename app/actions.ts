"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, ensureUser, identity, requireAccessApprover, requireAdmin, requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { decideRequest, issueClaim, revokeKey, saveKey, submitRequest } from "@/lib/workflow";
import { queueNotification, wakeNotificationWorker } from "@/lib/discord-notifications";
import { getNotificationSettings, parseNotificationSettingsInput } from "@/lib/settings";
import { decideAccessRequest, saveAccessRequestKey, submitAccessRequest } from "@/lib/access-request-workflow";
import { rejectKeyReplacement, replaceKey, requestKeyReplacement } from "@/lib/key-replacement-workflow";
import { restoreManualAccess } from "@/lib/manual-access-workflow";
const field = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const adminRedirect = (code: string, view = "requests") => redirect(`/admin?view=${view}&notice=${encodeURIComponent(code)}`);
export async function createSponsorship(data: FormData) { const actor = await requireMember(); try { await submitRequest(actor, { referredIdentifier: field(data, "discordId"), relationship: field(data, "relationship"), knownSince: field(data, "knownSince"), context: field(data, "context"), comment: field(data, "comment") || undefined, attestationAccepted: field(data, "attestationAccepted") === "true" }); } catch (error) { const message = error instanceof Error ? error.message : "Impossible de créer la demande."; redirect(`/parrainer?error=${encodeURIComponent(message)}`); } revalidatePath("/parrainer"); redirect("/parrainer?success=1"); }
export async function decide(data: FormData) { const actor = await requireAdmin(); const approved = field(data, "decision") === "approve"; try { await decideRequest(field(data, "requestId"), actor.discordId, approved, field(data, "rejectionReason")); } catch (error) { adminRedirect(error instanceof Error && error.message.includes("motif") ? "rejection_reason_required" : "decision_error"); } revalidatePath("/admin"); adminRedirect(approved ? "request_approved" : "request_rejected"); }
export async function archiveRequest(data: FormData) { const actor = await requireAdmin(); const requestId = field(data, "requestId"); try { const before = await prisma.sponsorshipRequest.findUnique({ where: { id: requestId }, select: { status: true } }); const request = await prisma.sponsorshipRequest.update({ where: { id: requestId }, data: { status: "ARCHIVED" } }); await audit("SPONSOR_REQUEST_ARCHIVED", actor.discordId, undefined, request.id, undefined, { previousStatus: before?.status, newStatus: "ARCHIVED" }); } catch { adminRedirect("archive_error"); } revalidatePath("/admin"); adminRedirect("request_archived"); }
export async function deleteRequest(data: FormData) { const actor = await requireAdmin(); const requestId = field(data, "requestId"); try { await audit("SPONSOR_REQUEST_DELETED", actor.discordId, undefined, requestId, undefined, { result: "success" }); await prisma.sponsorshipRequest.delete({ where: { id: requestId } }); } catch { adminRedirect("delete_error"); } revalidatePath("/admin"); adminRedirect("request_deleted"); }
export async function setSponsor(data: FormData) { const actor = await requireAdmin(); const discordId = field(data, "discordId"); if (!/^\d{17,20}$/.test(discordId)) adminRedirect("sponsor_invalid", "users"); try { const user = await ensureUser(discordId, discordId); const grant = field(data, "action") === "grant"; if (grant) { await prisma.sponsorPermission.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, grantedByDiscordId: actor.discordId } }); await audit("SPONSOR_PERMISSION_GRANTED", actor.discordId, discordId, undefined, undefined, { result: "success" }); await queueNotification({ type: "SPONSOR_GRANTED", recipientDiscordId: discordId, dedupeKey: `sponsor-granted:${discordId}`, message: "Le droit de parrainer vous a été accordé." }); } else { await prisma.sponsorPermission.deleteMany({ where: { userId: user.id } }); await audit("SPONSOR_PERMISSION_REVOKED", actor.discordId, discordId, undefined, undefined, { result: "success" }); await queueNotification({ type: "SPONSOR_REVOKED", recipientDiscordId: discordId, dedupeKey: `sponsor-revoked:${discordId}`, message: "Votre droit de parrainer a été retiré." }); } } catch { adminRedirect("sponsor_error", "users"); } revalidatePath("/admin"); adminRedirect(field(data, "action") === "grant" ? "sponsor_granted" : "sponsor_revoked", "users"); }
export async function storeKey(data: FormData) { const actor = await requireAdmin(); try { await saveKey(field(data, "requestId"), field(data, "secret"), actor.discordId); } catch { adminRedirect("key_error"); } revalidatePath("/admin"); adminRedirect("key_saved"); }
export async function revoke(data: FormData) { const actor = await requireAdmin(); try { await revokeKey(field(data, "keyId"), actor.discordId); } catch { adminRedirect("key_revoke_error", "keys"); } revalidatePath("/admin"); adminRedirect("key_revoked", "keys"); }
export async function createClaim() { const actor = await identity(); await issueClaim(actor.discordId); revalidatePath("/mon-acces"); }
export async function requestKeyReplacementAction(data: FormData) { const actor = await requireMember(); try { await requestKeyReplacement(actor, field(data, "reason")); } catch (error) { redirect(`/mon-acces?error=${encodeURIComponent(error instanceof Error ? error.message : "Impossible d’envoyer la demande de remplacement.")}`); } revalidatePath("/mon-acces"); redirect("/mon-acces?notice=key_replacement_requested"); }
export async function replaceKeyAction(data: FormData) { const actor = await requireAdmin(); try { await replaceKey(field(data, "replacementRequestId"), field(data, "secret"), actor.discordId); } catch { adminRedirect("key_replacement_error", "keys"); } revalidatePath("/admin"); revalidatePath("/mon-acces"); adminRedirect("key_replaced", "keys"); }
export async function rejectKeyReplacementAction(data: FormData) { const actor = await requireAdmin(); try { await rejectKeyReplacement(field(data, "replacementRequestId"), field(data, "decisionComment"), actor.discordId); } catch (error) { adminRedirect(error instanceof Error && error.message.includes("motif") ? "key_replacement_reason_required" : "key_replacement_error", "keys"); } revalidatePath("/admin"); revalidatePath("/mon-acces"); adminRedirect("key_replacement_rejected", "keys"); }

export async function updateNotificationSettings(data: FormData) {
  const actor = await requireAdmin();
  try {
    const current = await getNotificationSettings();
    const stored = await prisma.appSettings.findUnique({ where: { id: "global" }, select: { accessRequestWebhookEncrypted: true } });
    const parsed = parseNotificationSettingsInput(data.get("discordNotificationsEnabled"), data.get("notificationWorkerIntervalSeconds"), data.get("accessRequestWebhookUrl"));
    const webhookEncrypted = parsed.accessRequestWebhookUrl ? encrypt(parsed.accessRequestWebhookUrl) : stored?.accessRequestWebhookEncrypted ?? null;
    const next = { discordNotificationsEnabled: parsed.discordNotificationsEnabled, notificationWorkerIntervalSeconds: parsed.notificationWorkerIntervalSeconds, accessRequestWebhookEncrypted: webhookEncrypted };
    await prisma.appSettings.upsert({ where: { id: "global" }, update: { ...next, updatedByDiscordId: actor.discordId }, create: { id: "global", ...next, updatedByDiscordId: actor.discordId } });
    await audit("NOTIFICATION_SETTINGS_UPDATED", actor.discordId, undefined, undefined, undefined, {
      previous: { discordNotificationsEnabled: current.discordNotificationsEnabled, notificationWorkerIntervalSeconds: current.notificationWorkerIntervalSeconds, accessRequestWebhookConfigured: current.accessRequestWebhookConfigured },
      next: { discordNotificationsEnabled: next.discordNotificationsEnabled, notificationWorkerIntervalSeconds: next.notificationWorkerIntervalSeconds, accessRequestWebhookConfigured: Boolean(next.accessRequestWebhookEncrypted) },
      result: "success",
    });
    wakeNotificationWorker();
  } catch (error) {
    const reason = error instanceof Error && error.message.startsWith("L'intervalle") ? "INVALID_INTERVAL" : error instanceof Error && error.message.startsWith("L’URL") ? "INVALID_WEBHOOK" : "UPDATE_FAILED";
    try { await audit("NOTIFICATION_SETTINGS_UPDATE_FAILED", actor.discordId, undefined, undefined, undefined, { result: "error", reason }); } catch { /* ne masque pas l'erreur utilisateur */ }
    adminRedirect("settings_error", "settings");
  }
  revalidatePath("/admin");
  adminRedirect("settings_saved", "settings");
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

const accessRequestRedirect = (code: string) => redirect(`/demandes-acces?notice=${encodeURIComponent(code)}`);
export async function createAccessRequest(data: FormData) { const actor = await requireMember(); try { await submitAccessRequest(actor, { communitiesAndTrackers: field(data, "communitiesAndTrackers"), motivations: field(data, "motivations"), selfHostingExperience: field(data, "selfHostingExperience"), discoverySource: field(data, "discoverySource") || undefined }); } catch (error) { redirect(`/demande-acces?error=${encodeURIComponent(error instanceof Error ? error.message : "Impossible d’envoyer la demande.")}`); } revalidatePath("/demande-acces"); redirect("/demande-acces?success=1"); }
export async function decideAccessRequestAction(data: FormData) { const actor = await requireAccessApprover(); const approved = field(data, "decision") === "approve"; try { await decideAccessRequest(field(data, "requestId"), actor.discordId, approved, field(data, "decisionComment")); } catch (error) { accessRequestRedirect(error instanceof Error ? "access_request_error" : "access_request_error"); } revalidatePath("/demandes-acces"); revalidatePath("/demande-acces"); accessRequestRedirect(approved ? "access_request_approved" : "access_request_rejected"); }
export async function storeAccessRequestKey(data: FormData) { const actor = await requireAdmin(); try { await saveAccessRequestKey(field(data, "requestId"), field(data, "secret"), actor.discordId); } catch { accessRequestRedirect("access_request_key_error"); } revalidatePath("/demandes-acces"); revalidatePath("/demande-acces"); accessRequestRedirect("access_request_key_saved"); }
export async function setAccessApprover(data: FormData) { const actor = await requireAdmin(); const discordId = field(data, "discordId"); if (!/^\d{17,20}$/.test(discordId)) adminRedirect("approver_invalid", "users"); try { const user = await ensureUser(discordId, discordId); if (field(data, "action") === "grant") { await prisma.accessApproverPermission.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, grantedByDiscordId: actor.discordId } }); await audit("ACCESS_APPROVER_GRANTED", actor.discordId, discordId); } else { await prisma.accessApproverPermission.deleteMany({ where: { userId: user.id } }); await audit("ACCESS_APPROVER_REVOKED", actor.discordId, discordId); } } catch { adminRedirect("approver_error", "users"); } revalidatePath("/admin"); adminRedirect(field(data, "action") === "grant" ? "approver_granted" : "approver_revoked", "users"); }
export async function restoreManualAccessAction(data: FormData) { const actor = await requireAdmin(); try { await restoreManualAccess({ discordId: field(data, "discordId"), username: field(data, "username"), serverNickname: field(data, "serverNickname"), secret: field(data, "secret") }, actor.discordId); } catch (error) { redirect(`/admin?view=users&error=${encodeURIComponent(error instanceof Error ? error.message : "Impossible de restaurer cet accès.")}`); } revalidatePath("/admin"); redirect("/admin?view=users&notice=manual_access_restored"); }
