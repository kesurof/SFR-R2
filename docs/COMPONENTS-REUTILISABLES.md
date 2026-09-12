# Composants et helpers réutilisables

Ce catalogue décrit les briques existantes à rechercher avant d'ajouter du
markup, une interaction ou une logique de présentation. Il distingue les briques
génériques, les briques partagées dans un domaine et les composants propres à une
fonctionnalité.

La liste doit être mise à jour lorsqu'un composant devient partagé, qu'une API
change ou qu'un composant n'est plus réutilisable. Les chemins sont relatifs à la
racine du dépôt.

## Briques génériques

| Composant/helper | Chemin | Responsabilité et API principale | Usages actuels | Contraintes | Tests associés |
| --- | --- | --- | --- | --- | --- |
| `AppShell` | `app/components/app-shell.tsx` | Structure globale de l'application, navigation, compte et fil d'Ariane. Props : `nav`, `account`, `signOutAction`, `children`. | `app/layout.tsx` | Réserver à la structure globale ; ne pas y placer de logique métier de page. | `npm run typecheck`, `npm run build` |
| `ConfirmSubmit` | `app/components/confirm-submit.tsx` | Confirmation accessible avant soumission destructive d'un formulaire. Props : `title`, `message`, `confirmLabel`, `className`, `name`, `value`. | Administration des demandes et du webhook. | Doit être placé dans le formulaire concerné ; préserver l'annulation et le clavier. | `npm run build` |
| `PendingButton` | `app/components/pending-button.tsx` | Bouton de formulaire basé sur `useFormStatus`, désactivé pendant l'action. Props : `children`, `pendingLabel`, `className`, `name`, `value`. | Demande d'accès, parrainage, synchronisation Discord. | Doit être descendant d'un formulaire utilisant une action serveur. | `npm run build` |
| `StatusBadge` | `app/components/status-badge.tsx` | Présentation uniforme des statuts métier. Props : `status`. | Demandes d'accès, parrainage, récupération de clé. | Ajouter les nouveaux statuts dans `LABELS` plutôt que de recréer un badge local. | `npm run typecheck`, `npm run build` |
| `ToastProvider` / `useToast` | `app/components/toast.tsx` | Notifications globales avec types `success`, `error`, `warning`, `info`. | Layout, notifications flash, récupération de clé, création de lien. | Le provider doit rester monté dans le layout ; utiliser `aria-live` et ne pas détourner le focus. | `npm run build` |
| `FlashToasts` | `app/components/flash-toasts.tsx` | Traduit les paramètres de redirection (`notice`, `error`, `success`) en notifications via `useToast`. | `app/layout.tsx`. | Réserver aux messages issus des actions serveur ; ajouter les nouveaux codes dans `NOTICES`. | `npm run build` |
| `ThemeToggle` | `app/components/theme-toggle.tsx` | Bascule clair/sombre persistée dans `localStorage`. | `AppShell`. | Ne pas créer de bouton de thème local ; conserver le respect du thème système initial. | `npm run build` |
| `usePersistentState` | `app/components/use-persistent-state.ts` | État client persistant en `sessionStorage`, réhydraté après montage. API : `usePersistentState(key, initial)`. | Filtres des tables d'administration et des demandes d'accès. | Versionner la clé lorsqu'une forme de données change ; ne pas l'utiliser pour des secrets. | `npm run typecheck`, `npm run build` |

## Briques partagées dans un domaine

| Composant/helper | Chemin | Responsabilité et API principale | Usages actuels | Contraintes | Tests associés |
| --- | --- | --- | --- | --- | --- |
| `DiscordUserColumns` et `SortHeader` | `app/components/discord-user-columns.tsx` | Rend les en-têtes, filtres et cellules d'identité Discord, avec sélection optionnelle des colonnes via `visibleColumns`; `SortHeader` fournit le bouton de tri accessible partagé. | `admin?view=users` et `demandes-acces`. | Réutiliser ces composants pour toute table affichant des colonnes Discord ou un en-tête triable ; ne pas recopier le markup ou les filtres. | `tests/discord-user-columns.test.ts`, `tests/discord-user-columns-render.test.tsx`, `npm run typecheck`, `npm run build` |
| Helpers des colonnes Discord | `lib/discord-user-columns.ts` | Types, parsing/collecte des rôles, filtrage et comparaison des dates. | `UserTable`, `AccessRequestTable`, `DiscordUserColumns`. | Utiliser ces fonctions plutôt que parser `discordRoles` ou trier les anciennetés localement. | `tests/discord-user-columns.test.ts` |
| Ancienneté Discord | `lib/member-age.ts` | Décode la date de création d'un compte via son snowflake et formate une durée. API : `accountCreatedAt`, `formatAge`. | `DiscordUserColumns`, tables utilisateurs. | Ne pas réimplémenter le calcul des âges ; fournir une date de référence explicite dans les tests. | `tests/member-age.test.ts` |
| `RejectDialog` | `app/admin/reject-dialog.tsx` | Dialogue de saisie d'un motif de refus et soumission d'une action. Props : `requestId`, `action`, `commentField`. | Demandes de parrainage et demandes d'accès. | Spécifique aux décisions de refus ; réutiliser pour une autre demande seulement si le contrat reste identique. | `npm run build` |

## Composants propres à une fonctionnalité

Ces composants ne doivent pas être généralisés ou réutilisés sans vérifier que
leur contrat métier reste pertinent :

| Composant | Chemin | Fonctionnalité |
| --- | --- | --- |
| `CopyKey` | `app/components/copy-key.tsx` | Révélation et copie temporaire d'une clé R2. |
| `CreateClaimButton` | `app/components/create-claim-button.tsx` | Création du lien personnel de récupération de clé. |
| `AccessRequestDetails` | `app/demandes-acces/access-request-details.tsx` | Détails d'une demande d'accès directe. |
| `RequestTable` | `app/admin/request-table.tsx` | Table des demandes de parrainage de l'administration. |
| `UserTable` | `app/admin/user-table.tsx` | Table des utilisateurs Discord et de leurs permissions. Elle compose `DiscordUserColumns`. |
| `UserManagement` | `app/admin/user-management.tsx` | Section d'administration de la synchronisation et des utilisateurs. |

## Procédure de mise à jour

Lorsqu'une nouvelle interface est demandée :

1. rechercher ici et dans `app/components/` par responsabilité ou comportement ;
2. vérifier les usages existants et l'API réelle dans le code ;
3. composer avec une brique existante ou l'étendre si la duplication est réelle ;
4. documenter l'API, les contraintes et les tests si une brique devient partagée ;
5. laisser les composants purement métier dans leur domaine tant qu'aucun second
   usage réel ne justifie une abstraction.
