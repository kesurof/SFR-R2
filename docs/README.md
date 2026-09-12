# Documentation interne

Ce dossier est la mémoire maintenue du dépôt. Chaque document a une responsabilité
unique : il ne faut pas recopier une même information dans plusieurs sources.

| Besoin | Document à consulter |
| --- | --- |
| Comprendre l'application telle qu'elle est livrée | [ARCHITECTURE-CURRENT.md](ARCHITECTURE-CURRENT.md) |
| Identifier les composants et helpers réutilisables | [COMPONENTS-REUTILISABLES.md](COMPONENTS-REUTILISABLES.md) |
| Installer, exécuter ou contribuer localement | [README.md](../README.md) |
| Déployer avec Docker Compose | [DEPLOIEMENT.md](DEPLOIEMENT.md) |
| Déployer avec Coolify | [COOLIFY.md](COOLIFY.md) |
| Appliquer les règles de contribution et de maintenance de la mémoire | [AGENTS.md](../AGENTS.md) |
| Consigner ou retrouver une décision d'architecture durable | [DECISIONS.md](DECISIONS.md) |
| Retrouver le détail des changements passés | Git : `git log`, commits et pull requests |

Avant toute création ou modification d'un composant partagé, hook, helper UI,
formulaire, tableau, système de toast, mécanisme de persistance frontend ou
logique générique de présentation, consulter
[COMPONENTS-REUTILISABLES.md](COMPONENTS-REUTILISABLES.md). Ce catalogue est la
référence des briques existantes et de leurs contraintes ; son contenu n'est pas
recopié dans ce routeur documentaire.

## Documents créés au besoin

Le dépôt ne possède actuellement ni cible validée, ni roadmap validée, ni chantier
actif. Les documents suivants ne sont donc pas créés avant qu'ils aient un contenu
réel :

- une cible d'architecture : `ARCHITECTURE-TARGET.md` ;
- une roadmap : `ROADMAP.md` ;
- un suivi d'exécution : `PROGRESS.md` ;
- un dossier de chantier important, avec les documents utiles parmi `README.md`,
  `ARCHITECTURE-CURRENT.md`, `ARCHITECTURE-TARGET.md`, `DECISIONS.md`,
  `ROADMAP.md`, `PROGRESS.md` et `AI-INSTRUCTIONS.md`.

Une information future appartient à une roadmap ou à un chantier. Une information
sur un comportement déjà livré appartient à l'architecture actuelle. L'historique
détaillé ne quitte pas Git.
