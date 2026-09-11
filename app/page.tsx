import Link from "next/link";
import { auth, signIn } from "@/auth";
import { isAdmin } from "@/lib/access";
import { isDiscordMember } from "@/lib/membership";

const DISCORD_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.3 5.3A17 17 0 0 0 15 4l-.3.5a15 15 0 0 1 3.8 1.2 12.7 12.7 0 0 0-11 0A15 15 0 0 1 11.3 4.5L11 4a17 17 0 0 0-4.3 1.3C4 9.3 3.3 13.2 3.6 17a17 17 0 0 0 5.2 2.6l1-1.7a11 11 0 0 1-1.7-.8l.4-.3a12 12 0 0 0 10.2 0l.4.3a11 11 0 0 1-1.7.8l1 1.7A17 17 0 0 0 20.4 17c.4-4.4-.6-8.3-1.1-11.7zM9.7 14.7c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1zm4.6 0c-1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.9 2.1-1.9 2.1z" />
  </svg>
);

async function continueWithDiscord() {
  "use server";
  await signIn("discord", { redirectTo: "/" });
}

export default async function Home() {
  const session = await auth();
  const inviteUrl = process.env.DISCORD_INVITE_URL;

  if (!session?.user) {
    return (
      <div className="wrap narrow">
        <section className="hero">
          <span className="eyebrow">Service sur invitation</span>
          <h1>Un accès fondé sur la confiance.</h1>
          <p className="lead">
            Ce portail est réservé aux membres d&apos;un serveur Discord privé. Connecte-toi pour
            vérifier ton accès.
          </p>
          <form className="cta" action={continueWithDiscord}>
            <button className="btn primary" type="submit">
              {DISCORD_ICON}
              Continuer avec Discord
            </button>
          </form>
          <p className="faint" style={{ fontSize: 12, marginTop: "var(--s5)" }}>
            Les détails du service, le parrainage et la récupération de clé ne sont visibles
            qu&apos;une fois l&apos;appartenance au serveur vérifiée.
          </p>
        </section>
      </div>
    );
  }

  const admin = isAdmin(session.user.discordId);
  const isMember = admin || (await isDiscordMember(session.user.discordId));

  if (!isMember) {
    return (
      <div className="wrap narrow">
        <section className="hero">
          <span className="chip" style={{ marginBottom: "var(--s4)" }}>
            <span className="avatar" style={{ width: 18, height: 18 }} />
            Connecté : <strong style={{ color: "var(--text)" }}>&nbsp;{session.user.username}</strong>
          </span>
          <h1 style={{ fontSize: 26 }}>Accès réservé aux membres du serveur</h1>
          <p className="lead" style={{ fontSize: 15 }}>
            Ton compte Discord est bien connecté, mais tu n&apos;apparais pas dans la liste des
            membres du serveur privé. Le parrainage et les détails du service restent masqués tant que
            l&apos;appartenance n&apos;est pas confirmée.
          </p>
          <div className="cta">
            {inviteUrl ? (
              <a className="btn primary" href={inviteUrl} target="_blank" rel="noreferrer">
                Rejoindre le serveur Discord
              </a>
            ) : null}
            <form action={continueWithDiscord}>
              <button className="btn ghost" type="submit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                </svg>
                Revérifier
              </button>
            </form>
          </div>
          <div className="banner info" style={{ marginTop: "var(--s5)", fontSize: 12.5 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01M11 12h1v4h1" />
            </svg>
            <p>
              Déjà sur le serveur ? La vérification peut prendre une minute après ton arrivée. Reclique
              sur « Revérifier ».
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="wrap">
      <section className="hero">
        <span className="eyebrow">Service sur invitation</span>
        <h1>Bienvenue, {session.user.username}.</h1>
        <p className="lead">
          Le portail réserve l&apos;accès au stockage R2 privé de StreamFusion Reborn aux membres du
          serveur et aux personnes parrainées par l&apos;équipe.
        </p>
        <div className="ecosystem">
          <span className="chip">
            <span className="dot" style={{ background: "#5865F2" }} />
            Serveur Discord vérifié
          </span>
          <span className="chip">
            <span className="dot" style={{ background: "var(--accent)" }} />
            Clé StreamFusion Reborn
          </span>
        </div>
        <div className="cta">
          <Link className="btn primary" href="/parrainer">
            Parrainer une personne
          </Link>
          <Link className="btn ghost" href="/mon-acces">
            Récupérer mon accès
          </Link>
        </div>
      </section>
      <div className="steps">
        <div className="step">
          <div className="n" />
          <h3>Parrainage</h3>
          <p>Un membre autorisé te recommande en expliquant le contexte à l&apos;équipe.</p>
        </div>
        <div className="step">
          <div className="n" />
          <h3>Validation équipe</h3>
          <p>Un administrateur examine la demande et prépare ta clé d&apos;accès.</p>
        </div>
        <div className="step">
          <div className="n" />
          <h3>Clé R2</h3>
          <p>Tu récupères une clé unique à renseigner dans la configuration de StreamFusion Reborn.</p>
        </div>
      </div>
    </div>
  );
}
