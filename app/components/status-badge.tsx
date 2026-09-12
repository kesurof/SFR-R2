import { Tag } from "antd";

const LABELS: Record<string, [string, string]> = {
  PENDING: ["gold", "En attente"],
  APPROVED: ["green", "Acceptée"],
  KEY_READY: ["blue", "Clé prête"],
  REJECTED: ["red", "Refusée"],
  KEY_REVOKED: ["volcano", "Clé révoquée"],
  ARCHIVED: ["default", "Archivée"],
};

export function StatusBadge({ status }: { status: string }) {
  const [color, label] = LABELS[status] ?? ["default", status];
  return <Tag color={color}>{label}</Tag>;
}
