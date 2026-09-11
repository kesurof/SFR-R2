import { createSponsorship } from "@/app/actions";
import { identity, isAdmin, requireMember } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PendingButton } from "@/app/components/pending-button";

export default async function SponsorPage() {
  await requireMember();
  const actor = await identity();
  const user = await prisma.user.findUnique({
    where: { discordId: actor.discordId },
    include: { sponsorPermission: true },
  });

  if (!isAdmin(actor.discordId) && !user?.sponsorPermission) {
    return (
      <div className="wrap narrow">
        <div className="page-head">
          <span className="eyebrow">Parrainage</span>
          <h1>Autorisation requise</h1>
        </div>
        <div className="banner danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          <div>
            <b>Parrainage indisponible</b>
            <p>
              Ton compte Discord n&apos;a pas encore l&apos;autorisation de parrainer. Demande-la à un
              administrateur sur le serveur.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap narrow">
      <div className="page-head">
        <span className="eyebrow">Parrainage</span>
        <h1>Nouvelle recommandation</h1>
        <p>Indique uniquement des informations utiles à la décision de l&apos;équipe.</p>
      </div>

      <form action={createSponsorship} className="card" style={{ padding: 0 }}>
        <div className="panel-body stack" style={{ gap: "var(--s4)" }}>
          <div className="grid-2">
            <label className="field">
              <span>Filleul</span>
              <input name="discordId" placeholder="Discord ID, nom ou pseudo serveur" required />
              <span className="hint">17 à 20 chiffres pour un ID, ou un pseudo unique du serveur.</span>
            </label>
            <label className="field">
              <span>Votre relation</span>
              <input name="relationship" placeholder="Ami, collègue, famille…" required maxLength={160} />
            </label>
          </div>
          <div className="grid-2">
            <label className="field">
              <span>Depuis quand&nbsp;?</span>
              <input name="knownSince" placeholder="Ex. 3 ans" required maxLength={100} />
            </label>
            <label className="field">
              <span>
                Commentaire <span className="faint">· facultatif</span>
              </span>
              <input name="comment" placeholder="Élément complémentaire utile" maxLength={1000} />
            </label>
          </div>
          <label className="field">
            <span>Contexte</span>
            <textarea
              name="context"
              placeholder="Comment tu connais cette personne et pourquoi tu la recommandes."
              required
              maxLength={1000}
            />
          </label>
        </div>
        <div className="panel-head" style={{ borderTop: "1px solid var(--border)", borderBottom: 0 }}>
          <label className="check">
            <input type="checkbox" name="attestationAccepted" value="true" required />
            Je confirme connaître cette personne et j&apos;assume cette recommandation.
          </label>
          <PendingButton pendingLabel="Envoi…">Envoyer la demande</PendingButton>
        </div>
      </form>
    </div>
  );
}
