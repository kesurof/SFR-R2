# Architecture actuelle

> Référence de l'état observé dans le dépôt au 11 septembre 2026. Ce document
> décrit uniquement le comportement livré ; il ne contient ni cible, ni roadmap.

## Vue d'ensemble

SFR-R2 est un portail privé pour remettre des clés d'accès au stockage R2 de
StreamFusion Reborn. C'est une application unique Next.js 15 avec App Router,
rendue en image Docker autonome. Elle utilise SQLite, piloté par Prisma, et Discord
pour l'authentification, la vérification d'appartenance et la synchronisation des
membres.

Les frontières principales sont les suivantes :

- `app/` porte les pages, composants, actions serveur et routes HTTP ;
- `auth.ts` établit la session Auth.js via OAuth Discord ;
- `lib/` concentre les règles métier, l'accès aux données, les intégrations Discord,
  le chiffrement, la configuration et les protections transversales ;
- `prisma/schema.prisma` et `prisma/migrations/` définissent et font évoluer le
  schéma SQLite ;
- Docker démarre le serveur Next.js après avoir appliqué les migrations au volume
  SQLite persistant `/data`.

## Accès et rôles

La connexion Discord utilise le scope `identify guilds`. L'identifiant Discord
utilisé pour les autorisations est le `providerAccountId` Discord, stocké dans le
jeton de session ; ce n'est pas l'identifiant interne générique d'Auth.js.

Un administrateur est un identifiant présent dans `ADMIN_DISCORD_IDS`. Il peut
accéder à l'administration sans vérification d'appartenance au serveur. Les autres
utilisateurs doivent être membres du serveur Discord : la vérification interroge
l'API Discord avec le token du bot et conserve le résultat en mémoire pendant une
minute. En cas d'absence de configuration ou d'indisponibilité de Discord, l'accès
est refusé. Les actions de soumission revalident cette appartenance côté serveur,
au-delà de la protection des pages.

Les administrateurs gèrent les droits de parrainage et d’approbation, synchronisent les membres,
décident des demandes, enregistrent ou révoquent les clés et configurent les
notifications privées Discord. Un membre non administrateur ne peut parrainer
qu'après obtention du droit correspondant.

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

La base conserve des journaux d'audit pour les actions métier et administratives.
Les demandes peuvent aussi être archivées ou supprimées depuis l'administration.

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
clés chiffrées, jetons de récupération, journaux d'audit, état de synchronisation,
paramètres globaux et notifications Discord. Prisma est la couche d'accès aux
données et ses migrations versionnées sont la source de vérité du schéma.

Les secrets de clés sont chiffrés avec AES-256-GCM à partir de `ENCRYPTION_KEY`.
La base conserve aussi une empreinte SHA-256 et des préfixe/suffixe d'affichage ;
elle ne stocke pas les jetons de récupération en clair.

La synchronisation Discord lit les rôles et pagine les membres du serveur. Elle
met à jour le nom, surnom de serveur, date d'arrivée et noms de rôles des membres
connus, puis enregistre son résultat dans `SyncState`.

Les notifications Discord sont des DM ou des messages de salon mis en file en base. Leur mise en file ne
fait pas échouer l'action métier qui les déclenche. Le worker démarré par
`instrumentation.ts` essaie immédiatement puis traite périodiquement les éléments
en attente, évite les doublons par réservation atomique, reprend les envois bloqués
et abandonne après trois échecs avec délais de reprise.

Les nouvelles demandes d’accès alertent le salon configuré dans les paramètres
globaux de l’application, sans exposer leurs réponses. Le demandeur est notifié par
DM à la soumission et à la décision ; les administrateurs reçoivent un DM lorsqu’une
demande acceptée attend une clé.

## Sécurité et configuration

Au démarrage, la configuration est validée : URL SQLite, secrets Auth.js et
Discord, identifiants Discord, clé de chiffrement de 32 octets encodée en base64,
ainsi que les limites de rate-limit et de notifications. En production, une URL
publique non locale doit être en HTTPS.

Le middleware applique un nonce CSP par requête, interdit l'encadrement et les
objets, restreint les sources de scripts et de connexions, et ajoute les en-têtes de
sécurité usuels. L'en-tête HSTS est envoyé pour les requêtes HTTPS en production.

Les valeurs de configuration et leur usage opérationnel sont documentés dans
`.env.example` et les guides de déploiement ; les secrets réels ne sont pas suivis
par Git.

## Construction, déploiement et vérification

L'image Docker multi-étape utilise Node 22 Alpine, produit la sortie Next.js
`standalone` et s'exécute avec l'utilisateur non-root `node`. Le script de démarrage
rejoue les fichiers SQL de migration dans l'ordre avant de lancer `server.js`.

La CI GitHub exécute `npm ci`, `npm test`, `npm run typecheck` et `npm run build`
sur les push et pull requests vers `main`. Hors pull request, elle publie l'image
GHCR privée multi-architecture `amd64` et `arm64`, puis crée le manifeste associé.

Les tests Vitest couvrent les règles de workflow, le chiffrement, la validation de
configuration, le rate-limit, l'appartenance Discord, les paramètres de
notifications, les snowflakes Discord et le middleware CSP. Les commandes de
référence sont `npm test`, `npm run typecheck` et, lorsque pertinent, `npm run build`.
