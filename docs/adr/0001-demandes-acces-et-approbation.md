# ADR 0001 — Demandes d’accès et approbation applicative

Statut : accepté

## Contexte

Le parrainage ne couvre pas les demandes directes de membres Discord. Les personnes
qui les examinent ne doivent ni devenir parrains, ni obtenir les privilèges
d'administration nécessaires à la création de clés.

## Décision

Créer un flux `AccessRequest` indépendant, avec une permission applicative
`AccessApproverPermission`. Les approbateurs et administrateurs prennent une
décision finale ; seuls les administrateurs créent une clé. Les alertes de nouvelles
demandes sont envoyées dans un salon Discord configuré par son ID.

## Conséquences

Le schéma, les autorisations et les notifications distinguent explicitement les
deux workflows. Le bot nécessite aussi l'autorisation d'écrire dans le salon de
demandes d'accès.

## Alternatives écartées

- Réutiliser les demandes de parrainage : elles portent une relation parrain/filleul
  et des permissions incompatibles avec ce flux.
- Utiliser un rôle Discord comme source d'autorisation : la permission applicative
  est attribuable sans couplage au nom, à la synchronisation ou à la gestion des
  rôles Discord.
