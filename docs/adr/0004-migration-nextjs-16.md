# ADR 0004 — Migration vers Next.js 16

Statut : accepté

## Contexte

L'application est livrée sur Next.js 15.5 avec React 19.1, Auth.js v5 bêta et une
sortie Docker `standalone`. Next.js 16 est la version Active LTS : Turbopack devient
le bundler par défaut, les API de requête synchrones (`cookies`, `headers`, `params`,
`searchParams`) sont définitivement asynchrones, et le fichier `middleware.ts` est
renommé `proxy.ts` (runtime Node uniquement). Next.js 16 exige Node.js ≥ 20.9 et
React 19.2.

Auth.js `5.0.0-beta.29` ne déclare pas Next.js 16 dans ses peer dependencies, ce qui
bloquerait une installation propre. Le projet utilise déjà les API asynchrones et
n'a ni `next lint`, ni `serverRuntimeConfig`, ni PPR expérimental.

## Décision

Passer à `next@16`, `react`/`react-dom@19.2` et `@types/react(-dom)@19.2`, et monter
`next-auth` à une version bêta déclarant Next.js 16. Renommer `middleware.ts` en
`proxy.ts` et l'export `middleware` en `proxy`, l'export `config.matcher` restant
inchangé. Adapter le test du middleware au nouveau chemin.

Conserver la sortie `output: "standalone"`, la configuration Prisma, l'image Docker
`node:22-alpine`, la CSP à nonce et l'architecture de Server Components.
L'exécution se fait avec Turbopack, sans configuration webpack.

## Conséquences

- Le build de production utilise Turbopack ; le moteur Prisma doit être tracé dans la
  sortie `standalone`.
- `proxy.ts` s'exécute sur le runtime Node ; l'injection du nonce CSP et des en-têtes
  de sécurité reste identique.
- `npm test`, `npm run typecheck` et `npm run build` doivent repasser, ainsi que le
  build de l'image Docker.
- La documentation d'architecture et d'exploitation est mise à jour après livraison.

## Alternatives écartées

- **Rester sur Next.js 15** : écarte la LTS active et le support React 19.2.
- **Conserver `middleware.ts` en runtime edge** : la convention est dépréciée et le
  projet n'exploite aucune capacité edge.
- **Build webpack via `--webpack`** : repousse la migration et aucune configuration
  webpack n'existe.
- **`--legacy-peer-deps` pour garder `next-auth` bêta.29** : masque un conflit de
  peer dependencies au lieu de mettre à jour Auth.js.
