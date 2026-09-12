# Composants, hooks et helpers réutilisables

Ce catalogue décrit les briques réellement présentes dans le dépôt. Il constitue
le premier point de recherche avant d'ajouter du markup, une interaction ou une
logique de présentation.

Les éléments sont classés selon leurs usages réels, et non selon leur emplacement
dans `app/components` ou `lib`. Une abstraction n'est pertinente que si elle
supprime une duplication réelle, possède une responsabilité claire et simplifie
la maintenance de ses consommateurs.

Les chemins sont relatifs à la racine du dépôt. La colonne « Tests » ne présente
que les tests réellement associés ; `typecheck` et `build` sont indiqués comme
des vérifications indirectes lorsqu'aucun test dédié n'existe.

## Composants et hooks génériques

| Élément | Type | Chemin | Responsabilité | API principale | Usages actuels | Contraintes | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `AppShell` | Composant partagé | `app/components/app-shell.tsx` | Structure globale Ant Design (`Layout`, `Sider`, `Menu`), navigation, compte et fil d'Ariane. | `nav`, `account`, `signOutAction`, `children` | `app/layout.tsx` | Réserver à la structure globale ; ne pas y placer de logique métier de page. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| `ConfirmSubmit` | Composant partagé | `app/components/confirm-submit.tsx` | Confirmation (`Popconfirm` Ant Design) avant la soumission d'une action destructive. | `title`, `message`, `confirmLabel`, `className`, `name`, `value`, `children` | `app/admin/request-table.tsx`, `app/admin/page.tsx` | Doit rester dans le formulaire concerné et préserver l'annulation et le `name/value` transmis à la Server Action. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| `PendingButton` | Composant partagé | `app/components/pending-button.tsx` | `Button` Ant Design en `loading` pendant une Server Action. | `children`, `pendingLabel`, `className`, `name`, `value` | Demande d'accès, parrainage, `/mon-acces`, administration et synchronisation Discord. | Doit être descendant du formulaire concerné et utiliser `useFormStatus`. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| `StatusBadge` | Composant partagé | `app/components/status-badge.tsx` | `Tag` Ant Design uniforme pour les statuts métier et leur libellé. | `status` | Demandes d'accès, parrainage, détails d'administration et `/mon-acces`. | Ajouter les statuts dans `LABELS` plutôt que recréer un badge local ; les statuts inconnus gardent leur valeur. | `tests/status-badge.test.tsx` |
| `ThemeProvider` | Composant et hook partagés | `app/components/theme-provider.tsx` | Fournit le thème Ant Design, la locale `fr_FR` et l'instance `App` (message, notification, modal) ; expose `useThemeMode`. | `ThemeProvider({ children })`, `useThemeMode(): { mode, setMode, toggle }` | `app/layout.tsx`, `ThemeToggle` et tout composant utilisant `App.useApp()`. | Provider unique monté dans le layout ; ne pas créer un second `ConfigProvider` ni un autre système de notification. | `tests/antd-theme.test.ts` |
| `FlashToasts` | Composant partagé | `app/components/flash-toasts.tsx` | Traduit `notice`, `error` et `success` dans l'URL en notifications Ant Design. | Aucun prop ; consomme `useSearchParams`, `usePathname`, `useRouter` et `App.useApp()`. | `app/layout.tsx` | Ajouter les nouveaux codes dans `NOTICES` ; réserver ce composant aux messages issus des redirections serveur. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| `ThemeToggle` | Composant partagé | `app/components/theme-toggle.tsx` | Bascule clair/sombre (`Button` Ant Design) via le contexte de `ThemeProvider`, persistée dans `localStorage`. | Aucun prop. | `AppShell`. | Utiliser `useThemeMode` et conserver la clé `sfr-theme` ; ne pas créer de bouton de thème local. | `tests/antd-theme.test.ts` |
| Thème Ant Design | Helper partagé | `app/theme/antd-theme.ts` | Traduit les palettes claire/sombre en tokens `ThemeConfig` d'Ant Design. | `createAntdTheme(mode)`, `THEME_STORAGE_KEY`, `ThemeMode` | `ThemeProvider`. | Conserver la clé `sfr-theme` ; ne pas dupliquer les couleurs ailleurs. | `tests/antd-theme.test.ts` |
| `usePersistentState` | Hook partagé | `app/components/use-persistent-state.ts` | Persiste un état sérialisable dans `sessionStorage` après hydratation. | `usePersistentState<T>(key, initial)` | Filtres de `RequestTable`, `UserTable` et `AccessRequestTable`. | Versionner la clé quand la forme change ; ne jamais y stocker de secret ; gérer l'indisponibilité du stockage. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| `FormField` | Composant partagé | `app/components/form-field.tsx` | Libellé, contrôle et aide d'un champ, compatible composants serveur. | `label`, `hint`, `children` | Formulaires de demande d'accès, parrainage, remplacement de clé, restauration et configuration. | Utiliser ce wrapper plutôt que recréer un libellé de champ ; les contrôles restent des composants Ant Design. | Aucun test dédié ; `npm run typecheck`, `npm run build` |

## Briques partagées dans un domaine

| Élément | Type | Chemin | Responsabilité | API principale | Usages actuels | Contraintes | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `buildDiscordUserColumns` | Helper partagé de domaine | `app/components/discord-user-columns.tsx` | Construit les colonnes Ant Design d'identité Discord, avec sélection optionnelle des colonnes et `getUser` pour les lignes imbriquées. | `visibleColumns?`, `getUser?` | `admin?view=users` et `demandes-acces`. | Réutiliser ce constructeur pour toute table affichant ces données ; ne pas recopier les colonnes ni leur tri. | `tests/discord-user-columns-render.test.tsx`, `npm run typecheck`, `npm run build` |
| Helpers des colonnes Discord | Helper partagé de domaine | `lib/discord-user-columns.ts` | Type de ligne, parsing et collecte des rôles, filtrage et comparaison des anciennetés. | `DiscordUserTableRow`, `parseDiscordRoles`, `collectDiscordRoles`, `matchesDiscordUserFilters`, `compareDiscordUsers` | `UserTable`, `AccessRequestTable`, `DiscordUserColumns`. | Utiliser ces fonctions plutôt que parser `discordRoles` ou trier les dates localement. | `tests/discord-user-columns.test.ts` |
| Ancienneté Discord | Helper partagé de domaine | `lib/member-age.ts` | Décode la date de création d'un compte Discord et formate une durée. | `accountCreatedAt`, `formatAge` | `DiscordUserColumns` et les tables utilisateurs. | Ne pas réimplémenter le calcul ; fournir une date de référence explicite dans les tests. | `tests/member-age.test.ts` |
| `RejectDialog` | Composant partagé d'administration | `app/admin/reject-dialog.tsx` | `Modal` Ant Design de saisie d'un motif de refus et soumission d'une action. | `requestId`, `requestIdField`, `action`, `commentField`, `title` | Demandes de parrainage, demandes d'accès et remplacements de clés. | Réutiliser pour une décision nécessitant un motif ; conserver les champs d'identifiant et de commentaire adaptés à l'action. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| Règles des demandes d'accès | Helper métier partagé | `lib/access-request-rules.ts` | Limites de saisie, statuts, validation et comparaison de statuts. | `ACCESS_REQUEST_LIMITS`, `accessRequestStatus`, `accessRequestInputError`, `accessRequestDecisionError`, `compareAccessRequestStatuses` | Workflow des demandes d'accès et `AccessRequestTable`. | Garder les règles pures et synchronisées avec les formulaires et le modèle métier. | `tests/access-request-rules.test.ts` |
| Règles de remplacement de clé | Helper métier partagé | `lib/key-replacement-rules.ts` | Statuts et validation des motifs de demande ou de refus. | `KEY_REPLACEMENT_REASON_MAX`, `keyReplacementInputError`, `keyReplacementDecisionError` | Workflow de remplacement et actions serveur. | Ne jamais déplacer la validation uniquement côté client. | `tests/key-replacement.test.ts` |
| Règles du workflow de parrainage et de récupération | Helper métier partagé | `lib/workflow-rules.ts` | Règles pures d'éligibilité, de refus et de consommation d'un lien. | `claimRefusal`, `isClaimUsable`, `rejectionReasonError`, `saveKeyEligibilityError` | `lib/workflow.ts` et les tests de workflow. | Ne pas y ajouter d'accès à la base ni de dépendance React. | `tests/workflow-rules.test.ts` |
| Notifications de remplacement de clé | Helper de présentation métier | `lib/key-replacement-notifications.ts` | Construit le lien ciblé et le DM administrateur sans secret. | `keyReplacementAdminUrl`, `buildKeyReplacementAdminMessage` | Workflow de remplacement et notification des administrateurs. | Utiliser uniquement une empreinte, un motif et un lien ; aucune clé en clair. | `tests/key-replacement.test.ts` |

| Validation d'une clé | Helper partagé de domaine | `lib/access-key-rules.ts` | Vérifie qu'un secret de clé n'est pas vide avant sa persistance. | `accessKeySecretError(secret)` | `lib/access-key.ts` et les tests de restauration manuelle. | Garder la validation côté serveur ; ne jamais journaliser le secret. | `tests/manual-access.test.ts` |
| Création de clé | Helper partagé de domaine | `lib/access-key.ts` | Chiffre un secret, calcule son hash et prépare les métadonnées d'affichage avant création d'une `AccessKey`. | `createAccessKey(tx, userId, secret)` | Workflows de parrainage, demande d'accès, remplacement et restauration manuelle. | Utiliser uniquement dans une transaction ; ne jamais retourner le secret ni écrire sa valeur dans un audit ou un log. | `tests/manual-access.test.ts`, `tests/crypto.test.ts` |

## Abstractions techniques existantes

| Élément | Type | Chemin | Responsabilité | API principale | Usages actuels | Contraintes | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `queueNotification` et worker Discord | Abstraction technique | `lib/discord-notifications.ts` | Met en file, déduplique, réserve, retente et délivre les notifications DM/webhook ; abandonne la file quand les notifications sont désactivées. | `queueNotification`, `processPendingNotifications`, `discardPendingNotifications`, `startNotificationWorker`, `wakeNotificationWorker` | Actions serveur, workflows, `instrumentation.ts`. | Les notifications sont non bloquantes pour l'action métier ; respecter les clés de déduplication et ne jamais contourner la file ; ne rien conserver quand c'est désactivé. | `tests/discord-notifications.test.ts` |
| Payload et envoi webhook | Wrapper de bibliothèque HTTP | `lib/discord-webhook.ts` | Construit et envoie le payload du webhook de demandes d'accès. | `buildAccessRequestWebhookPayload`, `sendDiscordWebhook`, `DiscordWebhookPayload` | `lib/discord-notifications.ts`. | Échapper les valeurs Markdown et conserver `allowed_mentions` fermé. | `tests/discord-webhook.test.ts` |
| `rateLimit` | Abstraction technique | `lib/rate-limit.ts` | Rate-limit en mémoire par clé et fenêtre temporelle. | `rateLimit`, `resetRateLimits` | Routes de récupération de clé. | Limité au processus courant ; ne pas le présenter comme un rate-limit distribué. | `tests/rate-limit.test.ts` |
| Gardes d'accès et identité | Abstraction technique | `lib/access.ts` | Résout l'identité et protège les pages/actions selon les rôles et l'appartenance Discord. | `identity`, `isAdmin`, `requireAdmin`, `requireMember`, `requireAccessApprover`, `ensureUser`, `audit` | Pages et actions serveur. | Répéter les vérifications côté serveur ; ne pas se fier uniquement au masquage de l'interface. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| Client Prisma partagé | Abstraction d'accès aux données | `lib/prisma.ts` | Fournit une instance Prisma réutilisable et compatible avec le développement Next.js. | `prisma` | Pages, actions et workflows serveur. | Serveur uniquement ; Prisma et le schéma restent la source de vérité des données. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| Validation de l'environnement | Helper de validation | `lib/env.ts` | Valide et met en cache la configuration avec Zod. | `validateEnv`, `resetEnvCache` | Démarrage, routes et intégrations. | Ne jamais contourner la validation ni documenter de secrets réels. | `tests/env.test.ts` |
| Actions typées | Abstraction technique | `lib/safe-action.ts` | Clients `next-safe-action`, middlewares d'autorisation et adaptateur `formAction` vers `<form action>`. | `actionClient`, `memberAction`, `adminAction`, `approverAction`, `formAction`, `errorMessage` | `app/actions.ts`. | Définir les actions dans un module `"use server"` ; conserver le post-redirect-get et ne pas exposer de message interne. | `tests/action-schemas.test.ts` |
| Schémas d'actions | Helper de validation | `lib/action-schemas.ts` | Schémas `FormData` des Server Actions, déléguant aux règles pures `lib/*-rules.ts`. | `sponsorshipFormSchema`, `accessRequestFormSchema`, `notificationSettingsSchema`, etc. | `app/actions.ts` et leurs tests. | Ne pas dupliquer une règle métier : appeler la fonction pure existante. | `tests/action-schemas.test.ts` |
| Champs sensibles — opt-out gestionnaires de mots de passe | Helper partagé | `app/components/anti-autofill.ts` | Attributs `data-*` empêchant Bitwarden, 1Password, LastPass, Dashlane et Proton Pass de proposer l'enregistrement d'un champ. | `ANTI_AUTOFILL_PROPS` | Champs « Nom Discord » et « Clé complète » de la restauration d'accès. | Étendre ce helper plutôt que recopier les attributs ; réserver aux champs qui ne doivent pas être mémorisés. | `tests/anti-autofill.test.tsx` |

## Composants propres à une fonctionnalité

Ces éléments ne doivent pas être généralisés ou réutilisés artificiellement sans
une seconde implémentation partageant réellement le même contrat métier.

| Élément | Type | Chemin | Fonctionnalité | Tests |
| --- | --- | --- | --- | --- |
| `CopyKey` | Composant métier | `app/components/copy-key.tsx` | Révélation et copie temporaire d'une clé R2 depuis un lien de récupération. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| `CreateClaimButton` | Composant métier | `app/components/create-claim-button.tsx` | Création et affichage du lien personnel de récupération de clé. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| `AccessRequestDetails` | Composant métier | `app/demandes-acces/access-request-details.tsx` | Détails d'une demande d'accès directe dans un `Drawer` Ant Design. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| `RequestDetails` | Composant métier | `app/admin/request-details.tsx` | Détails d'une demande de parrainage dans un `Drawer` Ant Design. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| `RequestTable` | Composant métier | `app/admin/request-table.tsx` | `Table` Ant Design des demandes de parrainage de l'administration. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| `UserTable` | Composant métier | `app/admin/user-table.tsx` | `Table` Ant Design des utilisateurs Discord et de leurs permissions ; elle compose `buildDiscordUserColumns` et des filtres nommés (« Parrainage », « Approbation »). | Aucun test dédié ; helpers couverts par `tests/discord-user-columns.test.ts`, puis `npm run typecheck`, `npm run build` |
| `AccessRequestTable` | Composant métier | `app/demandes-acces/access-request-table.tsx` | `Table` Ant Design d'instruction des demandes d'accès ; elle compose les colonnes Discord et le tri de statut. | Aucun test dédié ; règles et colonnes couvertes par `tests/access-request-rules.test.ts` et `tests/discord-user-columns-render.test.tsx`, puis `npm run typecheck`, `npm run build` |
| `UserManagement` | Composant métier | `app/admin/user-management.tsx` | Section d'administration de la synchronisation et de la gestion des utilisateurs. | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| `RestoreAccessForm` | Composant métier | `app/admin/restore-access-form.tsx` | Recherche d'un membre par nom/pseudo serveur et restauration de son accès (Discord ID déduit, membre présent requis). | `tests/manual-access.test.ts`, `tests/anti-autofill.test.tsx`, `npm run typecheck`, `npm run build` |
| `KeysTable` | Composant métier | `app/admin/keys-table.tsx` | `Table` Ant Design de l'historique des clés et des demandes de remplacement, en présentation neutre (aucun surlignage de ligne). | Aucun test dédié ; `npm run typecheck`, `npm run build` |
| `SponsorshipTable` | Composant métier | `app/parrainer/suivi/sponsorship-table.tsx` | `Table` Ant Design du suivi des parrainages d'un membre. | Aucun test dédié ; `npm run typecheck`, `npm run build` |

## Briques externes et choix actuels

Les dépendances actuellement utilisées sont React/Next.js, Auth.js via
`next-auth`, Prisma, Zod, Vitest, Ant Design 6 (`antd`, `@ant-design/icons`,
`@ant-design/nextjs-registry`) et Testing Library. Les briques suivantes ne sont
pas installées et ne doivent pas être ajoutées par réflexe :

| Besoin éventuel | Brique à considérer | Décision actuelle |
| --- | --- | --- |
| Tableaux complexes | TanStack Table | Ne pas introduire pour les tableaux actuels ; les besoins de tri, filtre et pagination restent limités et sont déjà factorisés par domaine. |
| Très grandes listes | TanStack Virtual | Aucun volume observé ne le justifie. |
| Formulaires | React Hook Form | Les formulaires utilisent les Server Actions typées et les contrôles Ant Design ; conserver cette approche tant qu'elle reste lisible. |
| Cache et mutations client | TanStack Query | Pas de cache client nécessaire pour les pages server-rendered actuelles. |
| Authentification | Better Auth | Auth.js est déjà intégré et couvre le besoin. |
| UI accessible | Ant Design 6 | Introduit par l'ADR 0005 ; composants cœur, thème et locale `fr_FR`. Pro Components écarté (pré-release). |
| UI accessible | shadcn/ui / Radix | Écarté au profit d'Ant Design par l'ADR 0005. |
| État dans l'URL | `nuqs` | Les paramètres actuels sont peu nombreux et utilisent les API Next.js natives. |
| Server Actions typées | `next-safe-action` | Adopté (ADR 0006) avec Zod et `zod-form-data` ; les formulaires restent natifs via l'adaptateur `formAction`. |
| Notifications | Sonner | Non retenu : `App`/`notification` d'Ant Design assure les notifications (ADR 0005). |
| Stockage local structuré | Dexie | `localStorage` et `sessionStorage` couvrent les besoins actuels ; aucune donnée offline structurée n'est présente. |
| Accès aux données | Drizzle ORM | Prisma est déjà la source de vérité du schéma et des migrations. |

Une nouvelle bibliothèque doit remplacer une quantité significative de code ou
résoudre un besoin concret partagé. Son adoption nécessite d'abord une proposition
comparant le code supprimé, la complexité ajoutée, le coût de migration et
l'impact sur les composants serveur/client.

## Opportunités détectées, non refactorées

L'audit relève les points suivants sans créer d'abstraction prématurée :

| Catégorie | Observation | Position actuelle |
| --- | --- | --- |
| Mutualisation potentielle | Le mode et la clé de thème sont centralisés dans `ThemeProvider` (`useThemeMode`), lus par `ThemeToggle` et les algorithmes Ant Design. | Source de vérité unique ; ne pas relire `localStorage` ou `data-theme` ailleurs. |
| Mutualisation potentielle | `RequestTable`, `UserTable` et `AccessRequestTable` ont des patterns proches de filtres persistés, reset et pagination. | Conserver les contrats métier locaux ; extraire seulement une brique dont l'API supprimerait une duplication mesurable. |
| Mutualisation potentielle | `ConfirmSubmit`, `RejectDialog`, `RequestDetails` et `AccessRequestDetails` s'appuient sur les overlays Ant Design (`Popconfirm`, `Modal`, `Drawer`). | Ne pas fusionner leurs contrats : confirmation destructive, motif obligatoire et affichage de détail sont des responsabilités différentes. |
| Mutualisation potentielle | Certains formulaires utilisent encore des boutons natifs alors que `PendingButton` existe. | Harmoniser lors d'une modification fonctionnelle de ces formulaires ; ne pas lancer une migration isolée uniquement documentaire. |
| Dette technique acceptable | Les tables sont des `Table` Ant Design distinctes par domaine. | Ne pas créer de `DataTable` générique tant que les colonnes, actions et contrats diffèrent réellement. |
| Dette technique acceptable | Il n'existe pas d'abstraction dédiée pour les paramètres de recherche ou l'accès aux données côté client. | Les API natives Next.js et les Server Components couvrent le besoin actuel. |

## Procédure de mise à jour

Avant toute nouvelle interface ou logique de présentation :

1. consulter ce catalogue et le document du domaine concerné ;
2. rechercher les composants, hooks et helpers proches avec `rg` ;
3. vérifier les dépendances déjà installées et les briques éprouvées adaptées ;
4. réutiliser l'existant lorsqu'il couvre le contrat ;
5. étendre une abstraction lorsqu'au moins deux usages partagent réellement le même besoin ;
6. créer une nouvelle abstraction uniquement lorsqu'aucune solution existante ne convient ;
7. mettre à jour le catalogue lorsqu'un élément devient partagé, change de contrat ou cesse de l'être ;
8. ajouter les tests ou vérifications correspondant au contrat de l'abstraction.

Ne pas créer une abstraction uniquement pour diminuer le nombre de lignes ou de
fichiers, pour anticiper un usage hypothétique ou pour envelopper une bibliothèque
sans valeur ajoutée. Préférer la composition, maintenir une source de vérité
unique et supprimer une ancienne abstraction devenue inutile après migration.
