"use client";

import { StatusBadge } from "@/app/components/status-badge";

type Audit = { event: string; actorDiscordId: string | null; createdAt: string };
export type RequestDetailsData = {
  referredName: string; referredUsername: string; referredId: string; referredNickname: string | null;
  sponsorName: string; sponsorId: string; relationship: string; knownSince: string; context: string; comment: string | null;
  attestationAccepted: boolean; attestationAcceptedAt: string | null; createdAt: string; decidedAt: string | null; decidedByDiscordId: string | null; audits: Audit[];
  status?: string;
  rejectionReason?: string | null;
};
const value = (text: string | null | undefined) => text?.trim() || "Non renseigné";
const labels: Record<string, string> = { SPONSOR_REQUEST_CREATED: "Demande créée", SPONSOR_REQUEST_APPROVED: "Demande acceptée", SPONSOR_REQUEST_REJECTED: "Demande refusée", SPONSOR_REQUEST_ARCHIVED: "Demande archivée", ACCESS_KEY_CREATED: "Clé enregistrée", SPONSOR_REQUEST_KEY_READY: "Clé disponible", ACCESS_KEY_REVOKED: "Clé révoquée", SPONSOR_REQUEST_KEY_REVOKED: "Accès révoqué" };

export function RequestDetails({ request }: { request: RequestDetailsData }) {
  return <>
    <button type="button" className="btn ghost sm details-trigger" onClick={(e) => { const dialog = (e.currentTarget.nextElementSibling as HTMLDialogElement | null); dialog?.showModal(); }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false">
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
      <span>Voir</span>
    </button>
    <dialog className="details-dialog" onClick={(e) => { if (e.target === e.currentTarget) (e.currentTarget as HTMLDialogElement).close(); }}>
      <div className="details-sheet">
        <div className="details-head">
          <div className="details-head-main">
            <span className="eyebrow">Détails de la demande</span>
            <h3>{request.referredName}</h3>
            <div className="details-status">
              {request.status && <StatusBadge status={request.status} />}
              <span>Soumise le {new Date(request.createdAt).toLocaleDateString("fr-FR")}</span>
            </div>
          </div>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={(e) => (e.currentTarget.closest("dialog") as HTMLDialogElement)?.close()}>×</button>
        </div>
        <div className="details-grid">
          <section><h4>Filleul</h4><dl><dt>Nom Discord</dt><dd>{value(request.referredUsername)}</dd><dt>Pseudo serveur</dt><dd>{value(request.referredNickname)}</dd><dt>Discord ID</dt><dd className="mono">{request.referredId}</dd></dl></section>
          <section><h4>Parrain</h4><dl><dt>Nom</dt><dd>{value(request.sponsorName)}</dd><dt>Discord ID</dt><dd className="mono">{request.sponsorId}</dd><dt>Attestation</dt><dd>{request.attestationAccepted ? "Confirmée" : "Non confirmée"}{request.attestationAcceptedAt ? ` · ${new Date(request.attestationAcceptedAt).toLocaleString("fr-FR")}` : ""}</dd></dl></section>
          <section><h4>Recommandation</h4><dl><dt>Relation</dt><dd>{value(request.relationship)}</dd><dt>Connu depuis</dt><dd>{value(request.knownSince)}</dd></dl></section>
          <section className="details-wide"><div className="details-copy-grid"><div><h4>Contexte</h4><p className="details-copy">{value(request.context)}</p></div><div><h4>Commentaire</h4><p className="details-copy">{value(request.comment)}</p></div></div></section>
          <section className="details-wide details-decision"><h4>Décision</h4><dl><dt>État</dt><dd>{request.status ? <StatusBadge status={request.status} /> : "Pas encore décidée"}</dd><dt>Date</dt><dd>{request.decidedAt ? new Date(request.decidedAt).toLocaleString("fr-FR") : "En attente de traitement"}</dd><dt>Traitée par</dt><dd>{value(request.decidedByDiscordId)}</dd></dl>{request.rejectionReason && <p className="details-rejection"><strong>Motif du refus</strong>{request.rejectionReason}</p>}</section>
          {request.audits.length > 0 && <section className="details-wide"><h4>Historique</h4><ul className="details-history">{request.audits.map((audit) => <li key={`${audit.event}-${audit.createdAt}`}><span>{labels[audit.event] ?? audit.event}</span><small>{new Date(audit.createdAt).toLocaleString("fr-FR")}{audit.actorDiscordId ? ` · ${audit.actorDiscordId}` : ""}</small></li>)}</ul></section>}
        </div>
      </div>
    </dialog>
  </>;
}
