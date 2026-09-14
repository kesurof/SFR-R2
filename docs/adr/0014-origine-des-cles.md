# ADR 0014 — Origine des clés dérivée des journaux d'audit

Statut : accepté

## Contexte

La vue `/admin?view=keys` présentait une colonne « Parrainé par » construite uniquement
à partir des demandes de parrainage. En pratique, les clés proviennent aussi de
demandes d'accès directes, de restaurations manuelles ou de remplacements, et aucune
demande de parrainage n'existait : la colonne affichait donc systématiquement
« Équipe », sans information utile.

`AccessKey` ne conserve pas l'origine de la clé. L'information existe toutefois dans
les journaux d'audit de création (`ACCESS_REQUEST_KEY_READY`, `ACCESS_KEY_CREATED`,
`ACCESS_KEY_RESTORED_MANUALLY`, `ACCESS_KEY_REPLACED`).

## Décision

Remplacer la colonne « Parrainé par » par « Origine », déterminée par clé :

- `resolveKeyOrigin` (`lib/key-origin.ts`) remonte la chaîne des remplacements
  (`ACCESS_KEY_REPLACED` → `metadata.previousKeyId`) jusqu'à l'événement de création :
  - `ACCESS_REQUEST_KEY_READY` → `Demande directe` (+ approbateur `decidedByDiscordId`) ;
  - `ACCESS_KEY_CREATED` → pseudo du parrain (+ approbateur `decidedByDiscordId`) ;
  - `ACCESS_KEY_RESTORED_MANUALLY` → `Restauration manuelle` (+ administrateur acteur) ;
  - sinon → `—`.
- La page admin charge les audits des clés affichées (requêtes bornées), les demandes
  référencées, puis résout les pseudos via `User` (repli sur le Discord ID).

La fonction de résolution est pure et testée (`tests/key-origin.test.ts`).

## Conséquences

- Aucune migration ni changement de schéma : l'origine est dérivée, la vue reste la
  seule consommatrice.
- L'origine est exacte même après un ou plusieurs remplacements, et distingue
  explicitement une demande directe d'un parrainage ou d'une restauration.
- La page admin exécute quelques requêtes supplémentaires bornées (audits, demandes,
  utilisateurs) ; aucune requête par ligne.
- Le journal d'audit devient de fait la source de l'origine affichée : toute évolution
  des événements de création doit rester compatible.

## Alternatives écartées

- Colonne « Parrainé par » conservée : ne représente ni les demandes directes ni les
  restaurations.
- Origine calculée par membre (demande acceptée la plus récente) : imprécise lorsqu'un
  membre a plusieurs origines ou des clés restaurées manuellement.
- Champ `origin` explicite sur `AccessKey` : plus lourd (migration, renseignement dans
  tous les parcours, backfill des clés existantes) et redondant avec les audits, pour
  un besoin de présentation.
