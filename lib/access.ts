import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isDiscordMember } from "@/lib/membership";
const adminIds = () => new Set((process.env.ADMIN_DISCORD_IDS ?? "").split(",").map(id => id.trim()).filter(Boolean));
export async function identity() { const session = await auth(); if (!session?.user?.discordId) redirect("/api/auth/signin?callbackUrl=/"); return session.user; }
export const isAdmin = (discordId: string) => adminIds().has(discordId);
export async function requireAdmin() { const current = await identity(); if (!isAdmin(current.discordId)) redirect("/"); return current; }
export async function requireMember() { const current = await identity(); if (!isAdmin(current.discordId) && !(await isDiscordMember(current.discordId))) redirect("/"); return current; }
export async function isAccessApprover(discordId: string) { return isAdmin(discordId) || !!(await prisma.accessApproverPermission.findFirst({ where: { user: { discordId } } })); }
export async function requireAccessApprover() { const current = await identity(); if (!isAdmin(current.discordId) && !(await isDiscordMember(current.discordId))) redirect("/"); if (!(await isAccessApprover(current.discordId))) redirect("/"); return current; }
// "Get or create" : ne modifie jamais le `username` d'un compte existant
// (la synchronisation Discord est la source de vérité pour le nom).
export async function ensureUser(discordId: string, username: string) { return prisma.user.upsert({ where: { discordId }, update: {}, create: { discordId, username } }); }
export async function audit(event: string, actorDiscordId?: string, targetDiscordId?: string, requestId?: string, keyId?: string, metadata: Record<string, unknown> = {}) {
  await prisma.auditLog.create({ data: { event, actorDiscordId, targetDiscordId, requestId, keyId, metadata: JSON.stringify(metadata) } });
}
