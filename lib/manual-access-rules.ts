import { accessKeySecretError } from "@/lib/access-key-rules";

export type ManualAccessInput = {
  discordId: string;
  username: string;
  serverNickname?: string;
  secret: string;
};

export function manualAccessInputError(input: ManualAccessInput): string | null {
  const discordId = input.discordId.trim();
  if (!/^\d{17,20}$/.test(discordId)) return "Le Discord ID doit contenir entre 17 et 20 chiffres.";
  if (!input.username.trim()) return "Le nom Discord est obligatoire.";
  return accessKeySecretError(input.secret);
}
