export type KeyOriginAudit = {
  event: string;
  actorDiscordId: string | null;
  requestId: string | null;
  metadata: string;
};

export type KeyOrigin =
  | { kind: "direct"; accessRequestId: string }
  | { kind: "sponsorship"; sponsorshipRequestId: string }
  | { kind: "manual"; actorDiscordId: string | null }
  | { kind: "unknown" };

const MAX_REPLACEMENT_CHAIN = 10;

function metadataValue(metadata: string, key: string): string | null {
  try {
    const parsed = JSON.parse(metadata || "{}") as Record<string, unknown>;
    return typeof parsed[key] === "string" ? (parsed[key] as string) : null;
  } catch {
    return null;
  }
}

/** Clé remplacée par une entrée `ACCESS_KEY_REPLACED` (métadonnée `previousKeyId`). */
export function previousKeyIdFromMetadata(metadata: string): string | null {
  return metadataValue(metadata, "previousKeyId");
}

/**
 * Détermine l'origine d'une clé à partir de son journal d'audit de création, en
 * remontant la chaîne des remplacements jusqu'à l'événement d'origine.
 */
export function resolveKeyOrigin(keyId: string, auditsByKeyId: Map<string, KeyOriginAudit>): KeyOrigin {
  let current: string | null = keyId;
  for (let depth = 0; depth < MAX_REPLACEMENT_CHAIN && current; depth += 1) {
    const audit = auditsByKeyId.get(current);
    if (!audit) return { kind: "unknown" };
    switch (audit.event) {
      case "ACCESS_REQUEST_KEY_READY": {
        const accessRequestId = metadataValue(audit.metadata, "accessRequestId");
        return accessRequestId ? { kind: "direct", accessRequestId } : { kind: "unknown" };
      }
      case "ACCESS_KEY_CREATED":
        return audit.requestId ? { kind: "sponsorship", sponsorshipRequestId: audit.requestId } : { kind: "unknown" };
      case "ACCESS_KEY_RESTORED_MANUALLY":
        return { kind: "manual", actorDiscordId: audit.actorDiscordId };
      case "ACCESS_KEY_REPLACED":
        current = previousKeyIdFromMetadata(audit.metadata);
        break;
      default:
        return { kind: "unknown" };
    }
  }
  return { kind: "unknown" };
}
