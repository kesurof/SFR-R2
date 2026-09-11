import { identity } from "@/lib/access";
import { claimOwner } from "@/lib/workflow";
import { CopyKey } from "@/app/components/copy-key";

export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const actor = await identity();
  const { token } = await params;
  const claim = await claimOwner(token);

  if (!claim || claim.key.user.discordId !== actor.discordId) {
    return (
      <div className="wrap narrow">
        <div className="page-head">
          <span className="eyebrow">Récupération de clé</span>
          <h1>Lien indisponible</h1>
          <p>Ce lien est expiré, déjà utilisé ou ne t&apos;appartient pas.</p>
        </div>
        <a className="btn ghost" href="/mon-acces">
          Retour à Mon accès
        </a>
      </div>
    );
  }

  return (
    <div className="wrap narrow">
      <div className="page-head">
        <span className="eyebrow">Remis à {actor.username}</span>
        <h1>Afficher votre clé</h1>
        <p>Elle ne sera affichée qu&apos;une seule fois. Copie-la avant de fermer cette page.</p>
      </div>
      <CopyKey token={token} expiresAt={claim.expiresAt.toISOString()} />
    </div>
  );
}
