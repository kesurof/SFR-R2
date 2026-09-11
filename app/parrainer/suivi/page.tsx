import Link from "next/link";
import { identity, isAdmin, requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/app/components/status-badge";

export default async function SponsorTrackingPage() {
  await requireMember();
  const actor = await identity();
  const sponsor = await prisma.user.findUnique({ where: { discordId: actor.discordId }, include: { sponsorPermission: true, sponsoredRequests: { include: { referred: { include: { accessKeys: { orderBy: { createdAt: "desc" }, take: 1 } } } }, orderBy: { createdAt: "desc" } } } });
  if (!isAdmin(actor.discordId) && !sponsor?.sponsorPermission) return <div className="wrap narrow"><div className="page-head"><span className="eyebrow">Mes parrainages</span><h1>Autorisation requise</h1></div><div className="banner danger"><p>Cette page est réservée aux parrains autorisés.</p></div></div>;
  return <div className="wrap"><div className="page-head"><span className="eyebrow">Parrainage</span><h1>Mes demandes</h1><p>Suivez l’avancement des personnes que vous avez recommandées.</p></div>{sponsor?.sponsoredRequests.length ? <div className="panel"><div className="tbl-wrap"><table><thead><tr><th>Filleul</th><th>Statut</th><th>Soumise</th><th>Décision</th><th>Clé</th></tr></thead><tbody>{sponsor.sponsoredRequests.map((request) => { const key = request.referred.accessKeys[0]; return <tr key={request.id}><td><strong>{request.referred.serverNickname || request.referred.username}</strong><span className="sub">{request.referred.discordId}</span></td><td><StatusBadge status={request.status} /></td><td className="mono faint">{request.createdAt.toLocaleDateString("fr-FR")}</td><td className="mono faint">{request.decidedAt?.toLocaleDateString("fr-FR") ?? "—"}</td><td>{key ? <><span className={`badge ${key.status === "ACTIVE" ? "ready" : "revoked"}`}>{key.status === "ACTIVE" ? "Disponible" : "Révoquée"}</span><span className="sub">Émise le {key.createdAt.toLocaleDateString("fr-FR")}{key.revokedAt ? ` · révoquée le ${key.revokedAt.toLocaleDateString("fr-FR")}` : ""}</span></> : <span className="faint">Pas encore attribuée</span>}</td></tr>; })}</tbody></table></div></div> : <div className="panel"><p className="empty-state">Vous n’avez encore soumis aucune demande.</p><Link className="btn primary sm" href="/parrainer">Créer une demande</Link></div>}</div>;
}
