# Architecture actuelle

> Référence de l'état observé dans le dépôt au 12 septembre 2026. Ce document
> décrit uniquement le comportement livré ; il ne contient ni cible, ni roadmap.

## Vue d'ensemble

SFR-R2 est un portail privé pour remettre des clés d'accès au stockage R2 de
StreamFusion Reborn. C'est une application unique Next.js 16 avec App Router,
rendue en image Docker autonome. Elle utilise SQLite, piloté par Prisma, et Discord
pour l'authentification, la vérification d'appartenance et la synchronisation des
membres. L'interface repose sur Ant Design 6 (thème clair/sombre, locale `fr_FR`)
et les Server Actions sont validées et typées avec `next-safe-action` et Zod.

Les frontières principales sont les suivantes :

- `app/` porte les pages, composants, actions serveur et routes HTTP ;
- `auth.ts` établit la session Auth.js via OAuth Discord ;
- `lib/` concentre les règles métier, l'accès aux données, les intégrations Discord,
  le chiffrement, la configuration, les schémas d'actions et le client d'actions typées ;
- `prisma/schema.prisma` et `prisma/migrations/` définissent et font évoluer le
  schéma SQLite ;
- Docker démarre le serveur Next.js après avoir appliqué les migrations au volume
  SQLite persistant `/data`.

L'interface est responsive. Au-dessus du breakpoint `lg` (992 px), la navigation
reste dans un `Sider` et les listes sont des `Table` Ant Design. En dessous, la
navigation passe dans un `Drawer` latéral et les tables sont rendues en cartes
empilées (`useIsMobile` + `MobileCardList`), avec des filtres pleine largeur et des
overlays (`Modal`, `Drawer`) ajustés à la largeur de l'écran. Le rendu desktop n'est
pas modifié par cette adaptation.

## Accès et rôles

La connexion Discord utilise le scope `identify guilds`. L'identifiant Discord
utilisé pour les autorisations est le `providerAccountId` Discord, stocké dans le
jeton de session ; ce n'est pas l'identifiant interne générique d'Auth.js.

Un administrateur est un identifiant présent dans `ADMIN_DISCORD_IDS`. Il peut
accéder à l'administration sans vérification d'appartenance au serveur. Les autres
utilisateurs doivent être membres du serveur Discord : la vérification interroge
l'API Discord avec le token du bot et conserve le résultat en mémoire pendant une
minute ; une réponse transitoire (429, 5xx ou panne réseau) est mémorisée beaucoup
plus brièvement pour ne pas verrouiller un membre légitime. En cas d'absence de
configuration ou d'indisponibilité de Discord, l'accès est refusé. Les actions de
soumission revalident cette appartenance côté serveur, au-delà de la protection des
pages.

Les administrateurs gèrent les droits de parrainage et d’approbation, synchronisent les membres,
décident des demandes, restaurent manuellement des accès, enregistrent, remplacent ou révoquent
les clés et configurent les notifications Discord. Un membre non administrateur ne peut parrainer
qu'après obtention du droit correspondant.

Dans la console d'administration, les indicateurs de synthèse (demandes en attente, clés actives,
notifications à traiter, membres synchronisés) renvoient vers la vue correspondante.

## Flux métier

### Demande d’accès directe

Un membre du serveur peut soumettre une demande indépendante du parrainage. Elle
contient ses communautés et trackers, motivations, parcours self-hosting et une
source de découverte facultative. Une seule demande est en attente par membre ; une
nouvelle demande est possible après un refus.

Les administrateurs et les membres ayant la permission applicative d’approbateur
peuvent accepter ou refuser la demande. Le refus exige un commentaire, et la
décision conserve son auteur, sa date et son commentaire. Une demande acceptée est
ensuite traitée par un administrateur pour créer la clé ; elle passe alors à
`KEY_READY`. La révocation de la clé la fait passer à `KEY_REVOKED`.

La vue d’instruction réutilise les informations Discord synchronisées pour afficher
le pseudo serveur, le nom et les anciennetés du compte et de l’adhésion au serveur.
Les colonnes d’identifiant et de rôles restent disponibles dans la vue
d’administration des utilisateurs, avec les helpers Discord partagés.

La page `/mon-acces` combine le dernier parrainage et la dernière demande d’accès du
membre : l’étape affichée est la plus avancée (`ready` > `revoked` > `approved` >
`pending` > `rejected`), ce qui couvre les deux parcours de délivrance.

### Parrainage et clé

1. Un parrain autorisé soumet une demande pour un membre Discord, avec une
   attestation obligatoire. Le filleul est résolu par Discord ID ou par un nom/pseudo
   de serveur unique dans les membres synchronisés, puis son appartenance actuelle
   au serveur est vérifiée.
2. Une seule demande `PENDING` peut exister pour un même filleul. Un administrateur
   l'accepte (`APPROVED`) ou la refuse (`REJECTED`) ; un refus exige un motif de 500
   caractères au plus.
3. Sur une demande acceptée, un administrateur enregistre la clé. La clé précédente
   active du membre est révoquée dans la même transaction, la nouvelle clé devient
   active et la demande passe à `KEY_READY`.
4. La révocation d'une clé active la marque `REVOKED` et fait passer les demandes
   `KEY_READY` concernées à `KEY_REVOKED`.

Toute révocation ou rotation annule aussi les demandes de remplacement `PENDING`
devenues orphelines. L'invariant d'une seule clé active par membre est garanti en
base par l'index partiel `one_active_key_per_user`, en plus des contrôles applicatifs.

### Remplacement de clé

Un membre possédant une clé active peut demander son remplacement depuis
`/mon-acces`, avec un motif obligatoire de 500 caractères maximum. La demande est
stockée dans `KeyReplacementRequest` et reste `PENDING` jusqu'à l'action d'un
administrateur. Une seule demande en attente est autorisée par membre.

La vue `/admin?view=keys` affiche la demande sur la ligne de la clé concernée. Le
remplacement révoque l'ancienne clé et crée la nouvelle dans une transaction unique,
puis marque la demande `COMPLETED` et l'associe à la nouvelle clé (`newKeyId`). La
demande est alors visible sur la ligne de la nouvelle clé active, avec l'empreinte
de la clé remplacée. Un refus conserve la clé active, marque la demande `REJECTED`
et conserve le motif de décision sur la ligne de la clé ciblée.

Un administrateur peut aussi remplacer directement une clé active depuis la colonne
Actions : la même rotation transactionnelle s'applique, une demande `COMPLETED`
synthétique (`Remplacement initié par un administrateur.`) assure la traçabilité et
le membre reçoit la même notification `KEY_REPLACED`. La colonne Actions propose
l'action principale `Remplacer` (ou `Traiter` quand une demande `PENDING` est
affichée) puis un menu `⋯` exposant `Révoquer` (clé active), `Refuser la demande`
(demande en attente) et `Supprimer`. La vue propose une recherche (membre,
identifiant, empreinte) et un filtre de statut persistés en session.

Le remplacement d'une clé révoquée est un renouvellement : toute clé active du membre
est d'abord révoquée pour garantir une seule clé active, puis la nouvelle clé est
créée et une demande `COMPLETED` synthétique (`Renouvellement d'une clé révoquée par
un administrateur.`) conserve la traçabilité. La contrainte d'unicité de `newKeyId`
et l'index partiel d'une seule demande `PENDING` par membre restent la source de
vérité de ces invariants.

La colonne Actions propose aussi `Supprimer` sur chaque clé : la suppression est
définitive. Une clé active est d'abord révoquée (audit `ACCESS_KEY_REVOKED`,
notification `KEY_REVOKED`), puis la clé est supprimée avec les demandes de
remplacement et les jetons de récupération qui la référencent ; un instantané est
conservé dans l'audit `ACCESS_KEY_DELETED`. Aucune valeur de clé en clair n'est
journalisée.

La base conserve des journaux d'audit pour les actions métier et administratives.
Les demandes peuvent aussi être archivées ou supprimées depuis l'administration.

Après une perte de données, un administrateur peut restaurer un accès depuis l'onglet
`/admin?view=restore` en recherchant un membre par nom Discord ou pseudo serveur (le
Discord ID est déduit de la sélection, jamais saisi) et en renseignant la clé complète.
Le membre doit être actuellement présent sur le serveur Discord ; sinon la restauration
est refusée. Sans sélection, le nom saisi est résolu par correspondance exacte unique
sur le nom Discord ou le pseudo serveur. Le profil d'un utilisateur existant n'est pas
écrasé. Une clé active déjà présente bloque la restauration. La nouvelle clé est active
immédiatement, datée au moment de la restauration et enregistrée avec les événements
d'audit `USER_CREATED_MANUALLY` et `ACCESS_KEY_RESTORED_MANUALLY` selon le cas. La
valeur en clair n'est jamais conservée dans un audit ou un journal.

### Récupération de clé

Un membre ayant une clé active peut créer un lien personnel. Le jeton aléatoire est
stocké uniquement sous forme de hash ; il expire après 15 minutes. La consommation
nécessite une session du propriétaire encore membre du serveur (ou administrateur),
une clé toujours active et un jeton non consommé. Une mise à jour conditionnelle
garantit qu'un jeton ne peut être consommé qu'une fois, même en cas de concurrence.

Les deux routes de récupération désactivent le cache HTTP et appliquent un
rate-limit en mémoire : création par utilisateur, consommation par utilisateur et,
si `TRUST_PROXY=true`, adresse transmise par le proxy. Ce rate-limit est local au
processus.

## Données et intégrations

SQLite contient les utilisateurs Discord, permissions de parrainage, demandes,
demandes de remplacement, clés chiffrées, jetons de récupération, journaux d'audit, état de synchronisation,
paramètres globaux et notifications Discord. Prisma est la couche d'accès aux
données et ses migrations versionnées sont la source de vérité du schéma.

Les secrets de clés sont chiffrés avec AES-256-GCM à partir de `ENCRYPTION_KEY`.
La base conserve aussi une empreinte SHA-256 et des préfixe/suffixe d'affichage ;
elle ne stocke pas les jetons de récupération en clair.

La création des enregistrements `AccessKey` est centralisée dans
`lib/access-key.ts`, utilisé par les parcours de parrainage, de demande d'accès,
de remplacement et de restauration manuelle. Les opérations de restauration sont
transactionnelles : un échec ne conserve ni nouvel utilisateur ni nouvelle clé.

La synchronisation Discord lit les rôles et pagine les membres du serveur (reprise
bornée sur `429`), met à jour par lots le nom, surnom de serveur, date d'arrivée et
noms de rôles des membres connus, puis enregistre son résultat dans `SyncState`.

Les notifications Discord sont des DM ou des messages de webhook mis en file en base. Leur mise en file ne
fait pas échouer l'action métier qui les déclenche. Le worker démarré par
`instrumentation.ts` essaie immédiatement puis traite périodiquement les éléments
en attente, évite les doublons par réservation atomique, reprend les envois bloqués
et abandonne après trois échecs avec délais de reprise.

Lorsque les notifications sont désactivées, aucune nouvelle notification n'est mise
en file et les éléments encore en attente sont abandonnés (`NOTIFICATIONS_DISABLED`)
au lieu d'être repris à la réactivation : les notifications ne sont émises que
lorsqu'elles sont activées.

Les nouvelles demandes d’accès alertent le webhook Discord configuré dans les
paramètres globaux de l’application avec un embed contenant le pseudo, la date et
un lien direct vers la demande, sans exposer ses réponses. Le demandeur est notifié
par DM à la soumission et à la décision ; les administrateurs reçoivent un DM
lorsqu’une demande acceptée attend une clé ou lorsqu’un membre demande le
remplacement de sa clé. Le DM de remplacement contient le motif, l’empreinte de la
clé actuelle et un lien direct vers la ligne de la vue des clés, sans jamais exposer
la clé en clair. Le demandeur est informé par DM après un remplacement ou un refus.

L’URL du webhook est chiffrée avec `ENCRYPTION_KEY` et n’est jamais renvoyée à
l’interface d’administration ni aux journaux. Sa configuration et sa suppression
se font depuis `/admin?view=settings`.

## Sécurité et configuration

Au démarrage, la configuration est validée : URL SQLite, secrets Auth.js et
Discord, identifiants Discord, clé de chiffrement de 32 octets encodée en base64,
ainsi que les limites de rate-limit et de notifications. En production, une URL
publique non locale doit être en HTTPS.

Le proxy applique un nonce CSP par requête, interdit l'encadrement et les
objets, restreint les sources de scripts et de connexions, et ajoute les en-têtes de
sécurité usuels. L'en-tête HSTS est envoyé pour les requêtes HTTPS en production.

Les champs de saisie destinés à des secrets, notamment la restauration manuelle d'un accès,
exposent les attributs d'opt-out des gestionnaires de mots de passe (`ANTI_AUTOFILL_PROPS`)
pour éviter leur mémorisation automatique.

Les valeurs de configuration et leur usage opérationnel sont documentés dans
`.env.example` et les guides de déploiement ; les secrets réels ne sont pas suivis
par Git.

## Construction, déploiement et vérification

L'image Docker multi-étape utilise Node 22 Alpine, produit la sortie Next.js
`standalone` et s'exécute avec l'utilisateur non-root `node`. Le script de démarrage
rejoue les fichiers SQL de migration dans l'ordre avant de lancer `server.js`.

La CI GitHub exécute `npm ci`, `npm test`, `npm run typecheck` et `npm run build`
sur les push vers `main` et `dev` et sur les pull requests vers `main`. Hors pull
request, elle publie l'image GHCR privée multi-architecture `amd64` et `arm64`, puis
crée le manifeste associé : le tag `latest` pour `main`, le tag `dev` pour `dev`.

Les tests Vitest couvrent les règles de workflow, le chiffrement, la validation de
configuration, le rate-limit, l'appartenance Discord, les paramètres et le cycle des
notifications Discord, les snowflakes Discord, le proxy CSP, le thème Ant Design, les
schémas d'actions et les attributs anti-gestionnaires de mots de passe. Les commandes de
référence sont `npm test`, `npm run typecheck` et, lorsque pertinent, `npm run build`.
