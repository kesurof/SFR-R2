# ADR 0010 — Renouvellement d'une clé révoquée par rotation

Statut : accepté

## Contexte

La vue des clés expose `Remplacer` sur les clés actives (ADR 0009). Une clé déjà
révoquée ne pouvait plus être renouvelée depuis cette vue, alors qu'un administrateur
peut avoir besoin de rétablir un accès perdu. Une clé révoquée n'a rien à révoquer :
il faut créer une nouvelle clé. Par ailleurs, un même membre peut conserver une
ancienne clé révoquée tout en possédant une clé active, et l'application garantit
qu'une seule clé est active à la fois.

## Décision

Ajouter l'action `Remplacer` sur toute clé révoquée. Une même action serveur
(`replaceKeyByIdAction`) traite les deux cas et une fonction unique
(`replaceKeyById`) dispatche selon le statut :

- clé `ACTIVE` : rotation transactionnelle déjà décrite par l'ADR 0009 ;
- clé `REVOKED` : renouvellement. Toute clé active du membre est d'abord révoquée,
  puis la nouvelle clé est créée.

Dans les deux cas, une demande `COMPLETED` synthétique est écrite pour la traçabilité
(`newKeyId`), le membre reçoit la notification `KEY_REPLACED` et l'audit
`ACCESS_KEY_REPLACED` conserve `previousKeyId`, `revokedActiveKeyIds` et l'origine
(`ADMIN` ou `ADMIN_REVOKED`).

## Conséquences

- L'invariant « une seule clé active par membre » est préservé : renouveler une clé
  révoquée révoque implicitement la clé active existante.
- La ligne de la clé révoquée expose uniquement `Remplacer` (pas `Révoquer`).
- La nouvelle clé porte la trace « Remplace la clé <empreinte> ».
- Aucun changement de schéma : la traçabilité reste portée par
  `KeyReplacementRequest.newKeyId`.

## Alternatives écartées

- Refuser le renouvellement lorsqu'une clé active existe : laisserait le bouton
  visible mais inopérant et forcerait un détour par la ligne active.
- Masquer le bouton tant qu'une clé active existe : l'action disparaîtrait dans le cas
  le plus fréquent, sans indiquer pourquoi.
- Créer un modèle ou un événement d'audit dédié au renouvellement : dupliquerait la
  traçabilité déjà portée par `KeyReplacementRequest` et `ACCESS_KEY_REPLACED`.
