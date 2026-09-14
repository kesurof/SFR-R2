# ADR 0009 — Remplacement direct d'une clé active par un administrateur

Statut : accepté

## Contexte

Le remplacement de clé n'existait que sous la forme d'une demande membre
(`KeyReplacementRequest`), traitée ensuite par un administrateur. Un administrateur
ne pouvait pas renouveler une clé active de sa propre initiative, par exemple après
la détection d'une fuite ou une demande hors portail.

L'ADR 0002 a introduit la rotation transactionnelle et la traçabilité sur la
nouvelle clé (`newKeyId`, ADR 0008). Ces briques permettent de réutiliser le même
chemin pour une action administrative directe.

## Décision

Ajouter une action `Remplacer` sur toute clé active dans la colonne Actions de la
vue `/admin?view=keys`. Elle exécute la même rotation que le traitement d'une
demande : révocation conditionnelle de la clé ciblée, création de la nouvelle clé,
audit `ACCESS_KEY_REPLACED` et notification `KEY_REPLACED` au membre.

Pour conserver une source de vérité unique de la traçabilité, l'action crée une
demande `COMPLETED` synthétique (`newKeyId`, `decidedByDiscordId`, `decidedAt`,
motif « Remplacement initié par un administrateur. »). Elle est donc visible sur la
ligne de la nouvelle clé, comme un remplacement demandé.

L'action est refusée si une demande `PENDING` existe déjà pour la clé ciblée ; le
bouton direct est masqué dans ce cas au profit du flux de demande existant.

## Conséquences

- Aucun changement de schéma : `KeyReplacementRequest` porte l'entrée synthétique.
- La colonne Actions est fixée à droite et expose `Remplacer` et `Révoquer` sur les
  clés actives, afin de rester visible malgré la largeur de la colonne Remplacement.
- La notification au membre est identique à celle d'un remplacement demandé.
- Une demande membre en attente reste le chemin prioritaire et bloque le doublon.

## Alternatives écartées

- Créer un modèle d'historique distinct : dupliquerait la traçabilité déjà portée
  par `KeyReplacementRequest` et `newKeyId`.
- Ne tracer que par audit : la colonne Remplacement n'aurait pas montré la rotation
  initiée par un administrateur.
- Autoriser le remplacement direct même avec une demande en attente : créerait deux
  flux concurrents sur la même clé et des demandes orphelines.
