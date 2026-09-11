import { createAccessRequest } from "@/app/actions";
import { PendingButton } from "@/app/components/pending-button";
import { StatusBadge } from "@/app/components/status-badge";
import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export default async function AccessRequestPage() {
  const actor = await requireMember();
  const latest = await prisma.accessRequest.findFirst({ where: { requester: { discordId: actor.discordId } }, orderBy: { createdAt: "desc" } });
  const locked = latest && ["PENDING", "APPROVED", "KEY_READY"].includes(latest.status);
  return <div className="wrap narrow"><div className="page-head"><span className="eyebrow">Accès privé</span><h1>Demander un accès</h1><p>Répondez brièvement : ces informations sont examinées uniquement dans le portail.</p></div>
    {locked ? <div className="panel"><div className="panel-body stack"><StatusBadge status={latest.status} /><p>{latest.status === "PENDING" ? "Votre demande est en cours d’examen." : latest.status === "APPROVED" ? "Votre demande est acceptée. L’équipe prépare votre clé." : "Votre clé est prête : rendez-vous dans Mon accès."}</p></div></div> : <form action={createAccessRequest} className="card" style={{ padding: 0 }}><div className="panel-body stack" style={{ gap: "var(--s4)" }}>
      {latest?.status === "REJECTED" && <div className="banner danger"><div><b>Dernière demande refusée</b><p>{latest.decisionComment || "Vous pouvez déposer une nouvelle demande si votre situation a changé."}</p></div></div>}
      <label className="field"><span>Serveurs Discord et trackers</span><textarea name="communitiesAndTrackers" required maxLength={600} placeholder="Les communautés ou trackers que vous fréquentez." /><span className="hint">600 caractères maximum.</span></label>
      <label className="field"><span>Vos motivations</span><textarea name="motivations" required maxLength={1000} placeholder="Pourquoi souhaitez-vous accéder au service ?" /><span className="hint">1 000 caractères maximum.</span></label>
      <label className="field"><span>Votre parcours self-hosting</span><textarea name="selfHostingExperience" required maxLength={1000} placeholder="Vos usages, projets ou expérience d’auto-hébergement." /><span className="hint">1 000 caractères maximum.</span></label>
      <label className="field"><span>Comment avez-vous connu le service <span className="faint">· facultatif</span></span><input name="discoverySource" maxLength={300} placeholder="Une personne, une communauté…" /></label>
    </div><div className="panel-head" style={{ borderTop: "1px solid var(--border)", borderBottom: 0 }}><span className="faint">Votre identité Discord est associée automatiquement.</span><PendingButton pendingLabel="Envoi…">Envoyer la demande</PendingButton></div></form>}
  </div>;
}
