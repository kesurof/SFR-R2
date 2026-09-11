// Helpers d'ancienneté — fonctions pures, aucune dépendance.

const DISCORD_EPOCH = 1_420_070_400_000; // 2015-01-01T00:00:00Z, en ms

/** Date de création d'un compte Discord, décodée depuis son snowflake. */
export function accountCreatedAt(discordId: string): Date | null {
  if (!/^\d{17,20}$/.test(discordId)) return null;
  return new Date(Number(BigInt(discordId) >> 22n) + DISCORD_EPOCH);
}

/** Durée écoulée depuis `from`, format compact FR : "12 j", "8 mois", "2 ans", "—". */
export function formatAge(from: Date | null | undefined, now: Date = new Date()): string {
  if (!from) return "—";
  const ms = now.getTime() - from.getTime();
  if (ms < 0) return "—";
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return "aujourd'hui";
  if (days < 30) return `${days} j`;
  const months = Math.floor(days / 30);
  if (days < 365) return `${months} mois`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 an" : `${years} ans`;
}
