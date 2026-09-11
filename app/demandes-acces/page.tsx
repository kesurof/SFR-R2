import { AccessRequestTable } from "@/app/demandes-acces/access-request-table";
import { isAdmin, requireAccessApprover } from "@/lib/access";
import { accessRequestStatus } from "@/lib/access-request-rules";
import { prisma } from "@/lib/prisma";

export default async function AccessRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string; request?: string }> }) {
  const actor = await requireAccessApprover(); const admin = isAdmin(actor.discordId); const { status, request: focusedRequestId } = await searchParams;
  const requests = await prisma.accessRequest.findMany({ include: { requester: true }, orderBy: { createdAt: "desc" }, take: 500 });
  const ids = [...new Set(requests.map((request) => request.decidedByDiscordId).filter((id): id is string => Boolean(id)))];
  const users = ids.length ? await prisma.user.findMany({ where: { discordId: { in: ids } }, select: { discordId: true, username: true, serverNickname: true } }) : [];
  const names = new Map(users.map((user) => [user.discordId, user.serverNickname || user.username]));
  const rows = requests.map((request) => ({ id: request.id, status: request.status, requesterName: request.requester.serverNickname || request.requester.username, requesterId: request.requester.discordId, createdAt: request.createdAt.toISOString(), decidedAt: request.decidedAt?.toISOString() ?? null, approverName: request.decidedByDiscordId ? names.get(request.decidedByDiscordId) ?? request.decidedByDiscordId : null, decisionComment: request.decisionComment, communities: request.communitiesAndTrackers, motivations: request.motivations, selfHosting: request.selfHostingExperience, discovery: request.discoverySource }));
  const focusedRequestStatus = accessRequestStatus(requests.find((item) => item.id === focusedRequestId)?.status);
  return <div className="wrap"><div className="page-head"><span className="eyebrow">Instruction</span><h1>Demandes d’accès</h1><p>Examinez les demandes puis acceptez ou refusez-les. Seuls les administrateurs remettent les clés.</p></div><div className="panel"><AccessRequestTable requests={rows} admin={admin} focusedRequestId={focusedRequestId} focusedRequestStatus={focusedRequestStatus} initialStatus={accessRequestStatus(status)} /></div></div>;
}
