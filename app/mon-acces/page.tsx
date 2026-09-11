import { requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { CreateClaimButton } from "@/app/components/create-claim-button";

const STEPS = [
  ["Demande de parrainage", "Soumise par ton parrain"],
  ["Validation de l'équipe", "Un administrateur examine la demande"],
  ["Clé préparée", "L'équipe ajoute ta clé R2"],
  ["Clé disponible", "À récupérer via un lien personnel"],
] as const;

type Stage = "none" | "pending" | "approved" | "ready" | "rejected" | "revoked";
const DONE: Record<Stage, number> = { none: 0, pending: 1, approved: 2, ready: 4, rejected: 1, revoked: 2 };

export default async function AccessPage() {
  const actor = await requireMember();
  const user = await prisma.user.findUnique({
    where: { discordId: actor.discordId },
    include: {
      referredRequests: { orderBy: { createdAt: "desc" }, take: 1 },
      accessKeys: { where: { status: "ACTIVE" }, take: 1 },
    },
  });

  const req = user?.referredRequests[0];
  const hasActiveKey = (user?.accessKeys.length ?? 0) > 0;

  let stage: Stage = "none";
  if (hasActiveKey || req?.status === "KEY_READY") stage = "ready";
  else if (req?.status === "KEY_REVOKED") stage = "revoked";
  else if (req?.status === "REJECTED") stage = "rejected";
  else if (req?.status === "APPROVED") stage = "approved";
  else if (req?.status === "PENDING") stage = "pending";

  const done = DONE[stage];

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="eyebrow">Votre accès</span>
        <h1>Récupérer votre clé</h1>
        <p>Suivi de ton compte et génération d&apos;un lien personnel à usage unique.</p>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>Statut du compte</h2>
          </div>
          <div className="panel-body">
            <div className="timeline">
              {STEPS.map(([title, sub], i) => {
                const cls = i < done ? "done" : i === done ? "current" : "pending";
                return (
                  <div className={`tl ${cls}`} key={title}>
                    <div className="tl-marker">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </div>
                    <div className="tl-body">
                      <h4>{title}</h4>
                      <p>{sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="stack">
          <div className="panel">
            <div className="panel-head">
              <h2>Générer mon lien</h2>
            </div>
            <div className="panel-body stack">
              {stage === "ready" ? (
                <>
                  <p className="muted" style={{ fontSize: 13 }}>
                    Ta clé est prête. Crée un lien personnel pour l&apos;afficher une seule fois.
                  </p>
                  <CreateClaimButton />
                  <div className="banner warn" style={{ fontSize: 12 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 8v5M12 16h.01" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                    <p>Le lien expire dans 15 minutes et ne fonctionne qu&apos;une seule fois.</p>
                  </div>
                </>
              ) : stage === "revoked" ? (
                <div className="banner danger" style={{ fontSize: 12.5 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                  <p>Ta clé a été révoquée. Contacte l&apos;équipe sur Discord pour en obtenir une nouvelle.</p>
                </div>
              ) : stage === "rejected" ? (
                <div className="banner danger" style={{ fontSize: 12.5 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                  <div>
                    <b>Ta demande de parrainage a été refusée.</b>
                    {req?.rejectionReason ? <p>{req.rejectionReason}</p> : null}
                    <p className="faint" style={{ marginTop: 6 }}>
                      Tu peux en discuter avec ton parrain, qui peut soumettre une nouvelle demande.
                    </p>
                  </div>
                </div>
              ) : stage === "none" ? (
                <div className="banner info" style={{ fontSize: 12.5 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8h.01M11 12h1v4h1" />
                  </svg>
                  <p>Aucun accès n&apos;a encore été préparé. Fais-toi parrainer sur le serveur Discord.</p>
                </div>
              ) : (
                <div className="banner warn" style={{ fontSize: 12.5 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8v5M12 16h.01" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                  <p>Ta demande suit son cours. Tu pourras générer ton lien dès que la clé sera prête.</p>
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Où utiliser la clé</h2>
            </div>
            <div className="panel-body stack" style={{ gap: "var(--s3)" }}>
              <p className="muted" style={{ fontSize: 12.5 }}>
                Ouvre la configuration de <strong>StreamFusion Reborn</strong> et colle la clé dans le
                champ <span className="mono">R2 access key</span>, puis valide.
              </p>
              <p className="faint" style={{ fontSize: 11.5 }}>
                Texte pas-à-pas à finaliser avec l&apos;équipe — emplacement réservé.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
