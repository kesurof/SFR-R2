const LABELS: Record<string, [string, string]> = {
  PENDING: ["pending", "En attente"],
  APPROVED: ["approved", "Acceptée"],
  KEY_READY: ["ready", "Clé prête"],
  REJECTED: ["rejected", "Refusée"],
  KEY_REVOKED: ["revoked", "Clé révoquée"],
  ARCHIVED: ["archived", "Archivée"],
};

export function StatusBadge({ status }: { status: string }) {
  const [cls, label] = LABELS[status] ?? ["archived", status];
  return <span className={`badge ${cls}`}>{label}</span>;
}
