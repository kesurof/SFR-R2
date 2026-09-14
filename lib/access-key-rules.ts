export function accessKeySecretError(secret: string): string | null {
  return secret.trim() ? null : "La clé ne peut pas être vide.";
}

/** Empreinte d'affichage masquée, sans jamais exposer le secret. */
export function accessKeyFingerprint(prefix: string, suffix: string): string {
  return `${prefix}••••••••${suffix}`;
}
