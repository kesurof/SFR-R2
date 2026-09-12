# ADR 0006 — Actions serveur typées avec next-safe-action et Zod

Statut : accepté

## Contexte

Les Server Actions extraient aujourd'hui leurs champs d'un `FormData` à la main, via
un helper `field()` ou des appels `data.get()` directs. Les erreurs sont encodées dans
l'URL (`?notice=`, `?error=`) puis traduites par `FlashToasts`, et certaines actions
détectent la nature de l'erreur par sous-chaîne de message. Les règles de validation
métier, elles, sont déjà des fonctions pures testées dans `lib/*-rules.ts`.

Cette combinaison duplique le parsing, disperse la validation et rend les erreurs non
typées. Le catalogue différait l'adoption de `next-safe-action` tant que la duplication
restait faible ; l'ajout des parcours de demande d'accès, de remplacement et de
restauration manuelle l'a fait augmenter.

## Décision

Adopter `next-safe-action@8` avec Zod pour définir des actions serveur typées :

- un module `lib/safe-action.ts` fournit les clients et des middlewares d'autorisation
  réutilisant `requireMember`, `requireAdmin` et `requireAccessApprover` ;
- les schémas Zod sont déclarés dans `lib/action-schemas.ts` et délèguent aux
  fonctions pures `lib/*-rules.ts`, qui restent la source de vérité unique ;
- le parsing `FormData` manuel et le helper `field()` sont supprimés ;
- les erreurs de validation et les erreurs serveur deviennent typées
  (`validationErrors`, `serverError`) au lieu de sous-chaînes de message ;
- un adaptateur `formAction` relie chaque action typée à l'API `<form action>` :
  il redirige vers un code/URL d'erreur en cas d'échec et laisse passer le
  `redirect()` de succès, ce qui conserve le post-redirect-get et le fonctionnement
  sans JavaScript, sans réécrire les formulaires en composants clients.

## Conséquences

- Le contrat interne des actions change : les entrées sont validées par des schémas
  Zod, mais les formulaires conservent `<form action>` et `FlashToasts` reste le
  canal d'affichage des codes d'URL.
- Les tests des règles pures restent inchangés ; des tests de schémas et
  d'intégration `next-safe-action` + Zod sont ajoutés.
- Le catalogue des composants et l'architecture actuelle sont mis à jour après
  livraison.
- Les routes API JSON existantes (`/api/claims`, `/api/claim/[token]`) restent des
  Route Handlers et ne sont pas converties.

## Alternatives écartées

- **Conserver les actions actuelles** : la duplication de parsing et d'erreurs
  augmente avec chaque parcours.
- **Zod seul, sans `next-safe-action`** : ne résout pas le typage de bout en bout des
  résultats d'action ni les middlewares d'autorisation.
- **tRPC** : surdimensionné pour une application monolithique qui utilise déjà les
  Server Actions.
- **Erreurs uniquement par chaînes de caractères** : fragile et incompatible avec des
  erreurs de champ typées.
