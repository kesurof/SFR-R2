# ADR 0007 — Restauration d'accès par recherche de membre

Statut : accepté

## Contexte

L'ADR 0003 permettait de restaurer un accès en saisissant un Discord ID, un nom et un
pseudo serveur facultatif. En pratique, l'administrateur connaît le membre par son nom
ou son pseudo serveur, pas son identifiant numérique, et une saisie manuelle d'ID est
source d'erreur.

Le portail ne doit par ailleurs restaurer l'accès qu'à une personne **actuellement
présente** sur le serveur Discord privé : une correspondance dans la base synchronisée
peut être obsolète après le départ d'un membre.

## Décision

Déplacer la restauration dans un onglet dédié de l'administration
(`/admin?view=restore`) :

- le champ d'identité est une recherche à la frappe parmi les membres synchronisés,
  portant sur le nom Discord et le pseudo serveur ; sélectionner un membre déduit son
  Discord ID (jamais affiché) ;
- si aucun membre n'est sélectionné, le nom saisi est résolu côté serveur par
  correspondance **exacte unique** sur le nom Discord ou le pseudo serveur ; aucune
  correspondance ou plusieurs correspondances refusent l'opération ;
- le membre résolu doit être actuellement présent sur le serveur Discord
  (`isDiscordMember`), sinon la restauration est refusée ;
- le champ « Pseudo serveur » disparaît ; la clé complète et le comportement
  transactionnel (refus si clé active, audits, chiffrement) restent inchangés ;
- le bouton de validation se place sur la même ligne que les champs.

## Conséquences

- Un utilisateur totalement absent de la base synchronisée ne peut plus être créé par
  ce parcours : la restauration cible un membre connu et présent sur le serveur.
- L'appartenance au serveur est vérifiée au moment de la restauration, sans se fier à
  l'état de synchronisation.
- Les règles pures (`lib/manual-access-rules.ts`), le schéma d'action et le workflow
  sont adaptés ; des tests couvrent la résolution par nom, l'absence de correspondance
  et le refus d'un non-membre.
- Le catalogue des composants et l'architecture actuelle documentent le nouvel
  onglet et le composant de formulaire.

## Alternatives écartées

- **Conserver la saisie d'un Discord ID** : source d'erreur et inutile lorsque le
  membre est recherché par son nom.
- **Se fier à la base synchronisée sans vérifier l'appartenance** : une donnée
  obsolète restaurerait un accès à un ancien membre.
- **Accepter une correspondance partielle** : risque de restaurer l'accès de la
  mauvaise personne.
- **Autoriser la création d'un membre absent de la base** : écarté par l'exigence
  d'appartenance actuelle au serveur.
