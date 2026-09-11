import { identity, isAdmin } from "@/lib/access";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await identity();
  if (!isAdmin(actor.discordId)) {
    return (
      <div className="wrap narrow">
        <div className="page-head">
          <span className="eyebrow">Accès administrateur refusé</span>
          <h1>Ton compte Discord n&apos;est pas administrateur.</h1>
          <p>
            Ajoute cet identifiant dans <code>ADMIN_DISCORD_IDS</code>, puis recrée le conteneur :
          </p>
        </div>
        <div className="card">
          <code>{actor.discordId}</code>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
