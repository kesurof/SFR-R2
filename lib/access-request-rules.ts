export const ACCESS_REQUEST_LIMITS = { communitiesAndTrackers: 600, motivations: 1000, selfHostingExperience: 1000, discoverySource: 300, decisionComment: 500 } as const;
export const ACCESS_REQUEST_STATUSES = ["PENDING", "APPROVED", "KEY_READY", "REJECTED", "KEY_REVOKED"] as const;
export type AccessRequestStatus = (typeof ACCESS_REQUEST_STATUSES)[number];

export function accessRequestStatus(value: unknown): AccessRequestStatus | undefined {
  return typeof value === "string" && (ACCESS_REQUEST_STATUSES as readonly string[]).includes(value)
    ? value as AccessRequestStatus
    : undefined;
}

export type AccessRequestInput = { communitiesAndTrackers: string; motivations: string; selfHostingExperience: string; discoverySource?: string };

export function accessRequestInputError(input: AccessRequestInput): string | null {
  for (const [key, label] of [["communitiesAndTrackers", "Serveurs Discord et trackers"], ["motivations", "Motivations"], ["selfHostingExperience", "Parcours self-hosting"]] as const) {
    const value = input[key].trim();
    if (!value) return `${label} est obligatoire.`;
    if (value.length > ACCESS_REQUEST_LIMITS[key]) return `${label} est limité à ${ACCESS_REQUEST_LIMITS[key]} caractères.`;
  }
  if ((input.discoverySource?.trim().length ?? 0) > ACCESS_REQUEST_LIMITS.discoverySource) return `Cette réponse est limitée à ${ACCESS_REQUEST_LIMITS.discoverySource} caractères.`;
  return null;
}

export function accessRequestDecisionError(approved: boolean, comment?: string): string | null {
  const value = comment?.trim() ?? "";
  if (!approved && !value) return "Un commentaire est obligatoire pour refuser la demande.";
  if (value.length > ACCESS_REQUEST_LIMITS.decisionComment) return `Le commentaire est limité à ${ACCESS_REQUEST_LIMITS.decisionComment} caractères.`;
  return null;
}
