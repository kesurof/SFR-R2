# ADR 0008 — Traçabilité du remplacement sur la nouvelle clé

Statut : accepté

## Contexte

Une demande de remplacement est créée avec `currentKeyId`, la clé active au moment
de la demande. Lors d'un remplacement abouti, cette clé passe `REVOKED` et une
nouvelle clé `ACTIVE` est créée dans la même transaction. La demande est alors
marquée `COMPLETED`, mais reste liée à l'ancienne clé.

La vue `/admin?view=keys` ne chargeait que les demandes `PENDING`. Après
traitement, la colonne « Remplacement » n'affichait plus rien : la clé active issue
du remplacement n'était reliée à aucune demande, et la ligne de l'ancienne clé
n'était plus porteuse d'information consultable.

## Décision

Ajouter un champ `newKeyId` nullable et unique à `KeyReplacementRequest`, renseigné
avec l'identifiant de la clé créée lorsque la demande passe `COMPLETED`.

La vue des clés rattache désormais chaque demande à la clé qu'elle concerne :

- une demande `COMPLETED` avec `newKeyId` est affichée sur la nouvelle clé active,
  avec l'empreinte de la clé remplacée ;
- une demande `PENDING`, `REJECTED`, ou `COMPLETED` héritée sans `newKeyId` reste
  affichée sur la clé ciblée.

## Conséquences

- Une migration SQLite reconstruit `KeyReplacementRequest` pour ajouter la clé
  étrangère et recrée l'index partiel `one_pending_key_replacement_per_user`, non
  représentable dans le schéma Prisma.
- La contrainte d'unicité sur `newKeyId` garantit qu'une clé n'est le résultat que
  d'un seul remplacement.
- Les demandes complétées avant la migration n'ont pas de `newKeyId`. Le rattachement
  retombe alors sur la clé ciblée, qui porte la trace « Traitée » ; leur historique
  reste par ailleurs dans les audits.
- La vue charge, pour les clés affichées, la demande la plus récente tous statuts
  confondus, afin que la colonne reste lisible après un refus comme après un
  remplacement.
- Le lien direct du DM administrateur cible l'élément de la ligne correspondante.

## Alternatives écartées

- Ne conserver que les demandes `PENDING` dans la vue : ne répond pas au besoin de
  relier une clé active au remplacement qui l'a produite.
- Déduire le lien via les journaux d'audit `ACCESS_KEY_REPLACED` : dépendance
  implicite à un journal non conçu comme relation de données.
- Afficher la demande uniquement sur l'ancienne clé : la ligne utile pour
  l'exploitation est la clé active, pas la clé révoquée.
