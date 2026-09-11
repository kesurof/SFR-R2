# Règles de travail du dépôt

## Lire avant de modifier

1. Consulter [docs/README.md](docs/README.md) puis le document correspondant au
   domaine touché.
2. Considérer le code, le schéma Prisma, les migrations et la configuration comme
   les sources de vérité de l'état livré. `docs/ARCHITECTURE-CURRENT.md` en est la
   mémoire explicative ; il ne la remplace pas.
3. Ne jamais introduire de secret réel dans le dépôt, les tests, les documents ou
   les sorties de commande.

## Synchroniser code, tests et documentation

Toute modification doit livrer ensemble les trois volets concernés :

- le code, la configuration, le schéma ou l'infrastructure nécessaires ;
- les tests ajoutés ou adaptés au comportement modifié ;
- la documentation d'état actuelle, d'exploitation ou de chantier affectée.

Mettre à jour `docs/ARCHITECTURE-CURRENT.md` uniquement lorsqu'un comportement est
effectivement livré. Mettre à jour `README.md`, `docs/DEPLOIEMENT.md`,
`docs/COOLIFY.md` ou `.env.example` lorsqu'un changement modifie leur information
opérationnelle. Toute modification de schéma doit inclure une migration Prisma et
documenter son impact lorsqu'il affecte l'architecture ou l'exploitation.

## Séparer présent, futur, décisions et historique

- L'architecture actuelle décrit des faits observables dans le dépôt, jamais des
  intentions ni des travaux non livrés.
- Toute information future va dans une roadmap validée ou dans la documentation du
  chantier qui la porte ; ne pas l'ajouter à l'architecture actuelle.
- Créer un ADR dans `docs/adr/` et l'indexer dans `docs/DECISIONS.md` pour tout
  choix durable d'architecture, de données, de sécurité, d'exploitation ou de
  contrat. Chaque ADR contient : Contexte, Décision, Conséquences et Alternatives
  écartées.
- Un chantier important possède seulement les fichiers nécessaires parmi
  `README.md`, `ARCHITECTURE-CURRENT.md`, `ARCHITECTURE-TARGET.md`, `DECISIONS.md`,
  `ROADMAP.md`, `PROGRESS.md` et `AI-INSTRUCTIONS.md`.
- Une roadmap doit rendre chaque tâche exécutable de façon autonome et, lorsque
  pertinent, préciser : CONTEXTE, ÉTAT ACTUEL, ÉTAT CIBLE, FICHIERS PROBABLES,
  CONTRAINTES, CHANGEMENT, NE PAS MODIFIER, TESTS et CRITÈRE DE RÉUSSITE.
- `PROGRESS.md` suit l'état vivant d'un chantier. Le détail chronologique des
  changements reste dans Git, les commits et les pull requests ; ne pas le dupliquer
  dans la documentation.

## Vérifier avant de livrer

Exécuter les contrôles adaptés au changement et signaler ceux qui ne peuvent pas
l'être :

- logique TypeScript ou règles métier : `npm test` ;
- tout changement TypeScript, Prisma ou contrat interne : `npm run typecheck` ;
- image, démarrage, dépendance de build ou configuration Next.js : `npm run build` ;
- schéma Prisma : vérifier la migration et son application dans le chemin de
  déploiement.

Ne marquer un changement comme terminé qu'après avoir synchronisé les documents
concernés et vérifié les contrôles applicables.
