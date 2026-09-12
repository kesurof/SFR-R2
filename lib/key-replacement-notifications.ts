export function keyReplacementAdminUrl(baseUrl: string, requestId: string) {
  return `${baseUrl.replace(/\/+$/, "")}/admin?view=keys&replacementRequest=${encodeURIComponent(requestId)}#replacement-${encodeURIComponent(requestId)}`;
}

export function buildKeyReplacementAdminMessage(input: {
  memberName: string;
  username: string;
  discordId: string;
  reason: string;
  createdAt: Date | string;
  fingerprint: string;
  adminUrl: string;
}) {
  const createdAt = new Date(input.createdAt).toLocaleString("fr-FR");
  return [
    "🔁 Demande de remplacement de clé",
    `Membre : ${input.memberName}`,
    `Nom Discord : ${input.username}`,
    `Discord ID : ${input.discordId}`,
    `Demandée le : ${createdAt}`,
    `Clé actuelle : ${input.fingerprint}`,
    `Motif : ${input.reason}`,
    `Ouvrir et traiter : ${input.adminUrl}`,
  ].join("\n");
}
