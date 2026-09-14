# ADR 0012 — Invariant d'une clé active unique et annulation des demandes orphelines

Statut : accepté

## Contexte

L'application garantit qu'un membre n'a qu'une seule clé active : chaque parcours
révoque la clé précédente avant d'en créer une nouvelle. Cet invariant n'était porté
que par le code, sans contrainte en base, ce qui le rendait vulnérable à une
concurrence entre deux écritures.

Par ailleurs, une demande de remplacement `PENDING` cible une clé précise. Si cette
clé est révoquée ou remplacée par un autre parcours (révocation, nouvelle clé de
parrainage, demande d'accès, renouvellement), la demande devenait impossible à
traiter : l'administrateur recevait « La clé ciblée n'est plus active ».

## Décision

- Ajouter un index partiel unique `one_active_key_per_user` sur
  `AccessKey(userId) WHERE status = 'ACTIVE'`, cohérent avec les index partiels
  existants (`one_pending_request_per_referred`, `one_pending_access_request_per_requester`,
  `one_pending_key_replacement_per_user`). Le `P2002` correspondant est converti en
  message clair dans `lib/access-key.ts`.
- Rejeter automatiquement les demandes de remplacement `PENDING` dont la clé ciblée
  est révoquée ou remplacée, via les helpers partagés de `lib/key-lifecycle.ts` :
  `markKeyReadyRequestsRevoked`, `rejectPendingReplacements` et
  `notifyRejectedReplacements`. Les parcours concernés sont `revokeKey`, `saveKey`,
  `saveAccessRequestKey`, `replaceKeyById` (renouvellement) et `deleteAccessKey` (qui
  supprime déjà les demandes liées).
- Aligner `deleteAccessKey` sur `revokeKey` : quand la clé supprimée était active,
  les demandes `KEY_READY` du membre passent à `KEY_REVOKED` et un audit
  `ACCESS_KEY_REVOKED` est écrit avant `ACCESS_KEY_DELETED`.

## Conséquences

- Une migration ajoute l'index partiel ; aucune donnée existante ne le viole.
- Une demande membre qui n'est plus traitable est marquée `REJECTED` avec un motif
  système et le membre est notifié, au lieu de rester bloquée.
- Les deux chemins de délivrance (parrainage, demande d'accès) partagent la même
  logique transactionnelle, sans duplication.
- Le statut de la demande de délivrance reste `KEY_READY` lorsqu'une nouvelle clé est
  émise (le membre conserve un accès), et passe à `KEY_REVOKED` uniquement lorsque
  l'accès est réellement perdu.

## Alternatives écartées

- S'en remettre au code seul : ne protège pas contre deux écritures concurrentes.
- Supprimer les demandes `PENDING` devenues orphelines : perd la trace et ne notifie
  pas le membre.
- Laisser les demandes orphelines : l'administrateur reçoit une erreur sur une
  demande qu'il ne peut ni traiter ni refuser.
