"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast, type ToastType } from "./toast";

/** Codes émis par les redirections des server actions (`?notice=`). */
const NOTICES: Record<string, [ToastType, string, string]> = {
  request_approved: ["success", "Demande acceptée", "Le filleul peut recevoir une clé."],
  request_rejected: ["success", "Demande refusée", "La demande a été marquée comme refusée."],
  request_archived: ["success", "Demande archivée", ""],
  request_deleted: ["success", "Demande supprimée", ""],
  key_saved: ["success", "Clé enregistrée", "Elle est disponible pour le filleul."],
  key_revoked: ["success", "Clé révoquée", "Le membre a perdu l'accès au stockage R2."],
  sponsor_granted: ["success", "Droit de parrainage accordé", ""],
  sponsor_revoked: ["success", "Droit de parrainage retiré", ""],
  members_synced: ["success", "Synchronisation terminée", "Les membres Discord sont à jour."],
  sync_error: ["error", "Synchronisation impossible", "Discord a refusé la lecture des membres. Vérifie le token du bot."],
  decision_error: ["error", "Action impossible", "Cette demande a déjà été traitée ou n'existe plus."],
  archive_error: ["error", "Action impossible", "Impossible d'archiver cette demande."],
  delete_error: ["error", "Action impossible", "Impossible de supprimer cette demande."],
  key_error: ["error", "Action impossible", "Impossible d'enregistrer la clé."],
  key_revoke_error: ["error", "Action impossible", "Impossible de révoquer cette clé."],
  settings_saved: ["success", "Configuration enregistrée", "Les nouveaux réglages sont pris en compte sans redémarrage."],
  settings_error: ["error", "Configuration invalide", "Vérifie l’intervalle (entre 10 et 3 600 secondes)."],
  sponsor_error: ["error", "Action impossible", "Impossible de modifier ce droit."],
  sponsor_invalid: ["error", "Discord ID invalide", "Attendu : 17 à 20 chiffres."],
  rejection_reason_required: ["error", "Motif obligatoire", "Indique un motif avant de refuser la demande."],
  access_request_approved: ["success", "Demande d’accès acceptée", "Les administrateurs ont été prévenus pour la clé."],
  access_request_rejected: ["success", "Demande d’accès refusée", "Le demandeur a été informé."],
  access_request_key_saved: ["success", "Clé enregistrée", "Elle est disponible pour le demandeur."],
  access_request_error: ["error", "Action impossible", "La demande a déjà été traitée ou le commentaire est invalide."],
  access_request_key_error: ["error", "Action impossible", "Impossible d’enregistrer la clé."],
  approver_granted: ["success", "Droit d’approbation accordé", ""],
  approver_revoked: ["success", "Droit d’approbation retiré", ""],
};

export function FlashToasts() {
  const notify = useToast();
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
      notify(type, title, msg || undefined);
    } else if (error) {
      notify("error", "Demande non enregistrée", error);
    } else if (success) {
      notify("success", "Demande enregistrée", "L'équipe de StreamFusion Reborn va l'examiner.");
    }

    const clean = new URLSearchParams(params.toString());
    ["notice", "error", "success"].forEach((k) => clean.delete(k));
    const qs = clean.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, notify, router]);

  return null;
}
