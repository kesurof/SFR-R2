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
| [0003](adr/0003-restauration-manuelle-utilisateurs-cles.md) | Accepté | Les accès perdus peuvent être restaurés unitairement par un administrateur, avec création transactionnelle et audit explicite. |

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
