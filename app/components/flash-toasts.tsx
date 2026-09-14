"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { App } from "antd";

type NoticeType = "success" | "error" | "warning" | "info";

/** Codes émis par les redirections des server actions (`?notice=`). */
const NOTICES: Record<string, [NoticeType, string, string]> = {
  request_approved: ["success", "Demande acceptée", "Le filleul peut recevoir une clé."],
  request_rejected: ["success", "Demande refusée", "La demande a été marquée comme refusée."],
  request_archived: ["success", "Demande archivée", ""],
  request_deleted: ["success", "Demande supprimée", ""],
  key_saved: ["success", "Clé enregistrée", "Elle est disponible pour le filleul."],
  key_revoked: ["success", "Clé révoquée", "Le membre a perdu l'accès au stockage R2."],
  key_deleted: ["success", "Clé supprimée", "La clé a été supprimée définitivement."],
  key_delete_error: ["error", "Action impossible", "Impossible de supprimer cette clé."],
  sponsor_granted: ["success", "Droit de parrainage accordé", ""],
  sponsor_revoked: ["success", "Droit de parrainage retiré", ""],
  members_synced: ["success", "Synchronisation terminée", "Les membres Discord sont à jour."],
  sync_error: ["error", "Synchronisation impossible", "Discord a refusé la lecture des membres. Vérifie le token du bot."],
  decision_error: ["error", "Action impossible", "Cette demande a déjà été traitée ou n'existe plus."],
  archive_error: ["error", "Action impossible", "Impossible d'archiver cette demande."],
  delete_error: ["error", "Action impossible", "Impossible de supprimer cette demande."],
  key_error: ["error", "Action impossible", "Impossible d'enregistrer la clé."],
  key_revoke_error: ["error", "Action impossible", "Impossible de révoquer cette clé."],
  key_replaced: ["success", "Clé remplacée", "La nouvelle clé est disponible pour le membre."],
  key_replacement_rejected: ["success", "Demande refusée", "Le demandeur a été informé du motif."],
  key_replacement_error: ["error", "Action impossible", "Impossible de traiter cette demande de remplacement."],
  key_replacement_reason_required: ["error", "Motif obligatoire", "Indique un motif avant de refuser la demande."],
  settings_saved: ["success", "Configuration enregistrée", "Les nouveaux réglages sont pris en compte sans redémarrage."],
  webhook_cleared: ["success", "Webhook supprimé", "Les nouvelles demandes ne seront plus envoyées au webhook."],
  settings_error: ["error", "Configuration invalide", "Vérifie l’intervalle et l’URL du webhook Discord."],
  sponsor_error: ["error", "Action impossible", "Impossible de modifier ce droit."],
  sponsor_invalid: ["error", "Discord ID invalide", "Attendu : 17 à 20 chiffres."],
  rejection_reason_required: ["error", "Motif obligatoire", "Indique un motif avant de refuser la demande."],
  access_request_approved: ["success", "Demande d’accès acceptée", "Les administrateurs ont été prévenus pour la clé."],
  access_request_rejected: ["success", "Demande d’accès refusée", "Le demandeur a été informé."],
  access_request_key_saved: ["success", "Clé enregistrée", "Elle est disponible pour le demandeur."],
  access_request_error: ["error", "Action impossible", "La demande a déjà été traitée ou le commentaire est invalide."],
  access_request_key_error: ["error", "Action impossible", "Impossible d’enregistrer la clé."],
  key_replacement_requested: ["success", "Demande envoyée", "Les administrateurs ont été prévenus."],
  approver_granted: ["success", "Droit d’approbation accordé", ""],
  approver_revoked: ["success", "Droit d’approbation retiré", ""],
  manual_access_restored: ["success", "Accès restauré", "L’utilisateur et sa clé active ont été enregistrés."],
};

export function FlashToasts() {
  const { notification } = App.useApp();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const lastKey = useRef<string>("");

  useEffect(() => {
    const notice = params.get("notice");
    const error = params.get("error");
    const success = params.get("success");
    if (!notice && !error && !success) return;

    const key = `${pathname}|${notice ?? ""}|${error ?? ""}|${success ?? ""}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    if (notice && NOTICES[notice]) {
      const [type, title, msg] = NOTICES[notice];
      notification[type]({ message: title, description: msg || undefined, duration: type === "error" ? 0 : 5 });
    } else if (error) {
      notification.error({ message: "Demande non enregistrée", description: error, duration: 0 });
    } else if (success) {
      notification.success({
        message: "Demande enregistrée",
        description: "L'équipe de StreamFusion Reborn va l'examiner.",
      });
    }

    const clean = new URLSearchParams(params.toString());
    ["notice", "error", "success"].forEach((k) => clean.delete(k));
    const qs = clean.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, notification, router]);

  return null;
}
