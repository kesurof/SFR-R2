# ADR 0011 — Suppression définitive d'une clé depuis l'administration

Statut : accepté

## Contexte

La vue des clés permet de remplacer ou révoquer une clé, mais pas de retirer une
clé erronée ou une entrée historique devenue inutile. Les administrateurs ont besoin
d'une suppression définitive.

Le schéma contraint cette suppression : `KeyReplacementRequest.currentKeyId` référence
`AccessKey` en `RESTRICT`, et `ClaimToken.keyId` en `CASCADE`. Une clé ciblée par une
demande de remplacement ne peut donc pas être supprimée sans traiter cette demande.

## Décision

Ajouter `Supprimer` sur chaque ligne de la vue des clés. La suppression est
définitive et transactionnelle :

- si la clé est `ACTIVE`, elle est d'abord révoquée (audit `ACCESS_KEY_REVOKED` et
  notification `KEY_REVOKED`, comme une révocation normale) ;
- les demandes de remplacement qui référencent la clé (`currentKeyId` ou `newKeyId`)
  sont supprimées, ainsi que les jetons de récupération liés ;
- la clé est supprimée ;
- un audit `ACCESS_KEY_DELETED` conserve un instantané : empreinte d'affichage,
  statut précédent, caractère actif et identifiants des demandes supprimées.

Le bouton `Révoquer` reste réservé aux lignes `ACTIVE` ; `Remplacer` reste disponible
sur les clés actives et révoquées.

## Conséquences

- Aucun changement de schéma : la suppression des demandes liées satisfait la
  contrainte `RESTRICT`.
- La suppression est irréversible et efface l'historique de remplacement de la clé
  concernée ; l'instantané d'audit en garde la trace.
- Supprimer une clé active liée à une demande `PENDING` supprime cette demande : la
  confirmation de l'interface le signale.
- La suppression d'une clé qui est le résultat d'un remplacement supprime la demande
  correspondante, donc la trace « Remplace la clé … » disparaît avec la clé.

## Alternatives écartées

- Suppression logique (`deletedAt` / statut `DELETED`) : masque la clé sans la
  supprimer réellement, ce qui ne répond pas au besoin exprimé et ajoute un état à
  filtrer partout.
- Rendre `currentKeyId` nullable par migration : conserve les demandes mais affaiblit
  un lien considéré comme requis et complique l'affichage de la trace.
- Refuser la suppression si une demande référence la clé : empêcherait justement de
  supprimer les clés historiques concernées.
