# Décisions d'architecture

Ce registre accueille les décisions durables qui modifient l'architecture, les
contrats, les données, la sécurité, l'exploitation ou les conventions du dépôt.
Il ne reconstitue pas rétroactivement les motivations des choix déjà observables
dans le code : leur contexte et leurs alternatives ne sont pas attestés ici.

## Registre

| ADR | Statut | Résumé |
| --- | --- | --- |
| [0001](adr/0001-demandes-acces-et-approbation.md) | Accepté | Les demandes d’accès sont distinctes du parrainage et instruites par des approbateurs applicatifs. |
| [0002](adr/0002-remplacement-des-cles.md) | Accepté | Les remplacements de clés sont des demandes séparées, traitées dans la vue des clés par une rotation transactionnelle. |
| [0003](adr/0003-restauration-manuelle-utilisateurs-cles.md) | Remplacé par 0007 | Les accès perdus peuvent être restaurés unitairement par un administrateur, avec création transactionnelle et audit explicite. |
| [0004](adr/0004-migration-nextjs-16.md) | Accepté | L'application passe à Next.js 16, React 19.2 et renomme le middleware en proxy. |
| [0005](adr/0005-systeme-de-composants-ant-design.md) | Accepté | L'interface adopte Ant Design 6 comme système de composants et de thème, sans Pro Components. |
| [0006](adr/0006-actions-typees-next-safe-action.md) | Accepté | Les actions serveur deviennent typées via next-safe-action et Zod, en conservant la validation métier existante. |
| [0007](adr/0007-restauration-par-recherche-de-membre.md) | Accepté | La restauration d'accès se fait dans un onglet dédié, par recherche d'un membre présent sur le serveur, sans saisie du Discord ID. |
| [0008](adr/0008-tracabilite-remplacement-nouvelle-cle.md) | Accepté | Un remplacement abouti est rattaché à la nouvelle clé (`newKeyId`) et affiché sur sa ligne dans la vue des clés. |
| [0009](adr/0009-remplacement-direct-par-administrateur.md) | Accepté | Un administrateur peut remplacer directement une clé active depuis la colonne Actions, avec la même traçabilité qu'une demande traitée. |
| [0010](adr/0010-renouvellement-cle-revoquee.md) | Accepté | Remplacer une clé révoquée la renouvelle en révoquant au préalable toute clé active du membre. |
| [0011](adr/0011-suppression-definitive-cle.md) | Accepté | La suppression d'une clé est définitive : révocation préalable si active, suppression des demandes liées, audit `ACCESS_KEY_DELETED`. |
| [0012](adr/0012-cle-active-unique-et-demandes-orphelines.md) | Accepté | Index partiel d'une clé active unique et rejet automatique des demandes de remplacement devenues orphelines. |
| [0013](adr/0013-adaptation-mobile.md) | Accepté | Adaptation mobile sous `lg` (Drawer, cartes) sans modifier le rendu desktop. |

Les ADR futures sont créées sous `docs/adr/NNNN-titre-court.md`, avec une
numérotation séquentielle à quatre chiffres. `DECISIONS.md` est l'index de ces ADR,
pas une copie de leur contenu.

## Modèle obligatoire

```md
# ADR NNNN — Titre court

Statut : accepté | remplacé par ADR NNNN | abandonné

## Contexte

Faits, contrainte et problème qui rendent la décision nécessaire.

## Décision

Choix retenu et périmètre exact.

## Conséquences

Effets attendus, compromis, migrations ou obligations de maintenance.

## Alternatives écartées

Options étudiées et raison de leur rejet.
```

## Règles de maintenance

- Créer une ADR avant, ou dans le même changement que, toute décision durable.
- Ajouter dans le registre le lien, le statut et un résumé d'une ligne de chaque
  nouvelle ADR.
- Une ADR remplacée reste dans Git et est marquée avec l'ADR qui la remplace.
- Une décision temporaire ou propre à un chantier reste dans sa documentation de
  chantier tant qu'elle n'est pas devenue durable.
