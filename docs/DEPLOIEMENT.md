# Déploiement — Docker Compose

## 1. Préparer l'application Discord

Sur le [portail développeur Discord](https://discord.com/developers/applications) :

1. **New Application**.
2. Onglet **OAuth2**
   - noter *Client ID* → `AUTH_DISCORD_ID`
   - *Client Secret* (Reset Secret) → `AUTH_DISCORD_SECRET`
   - **Redirects** → ajouter `https://VOTRE-DOMAINE/api/auth/callback/discord`
3. Onglet **Bot**
   - *Reset Token* → `DISCORD_BOT_TOKEN`
   - **Privileged Gateway Intents** → activer **Server Members Intent** uniquement
4. Installer le bot sur le serveur (onglet *Installation* ou URL OAuth2 avec le scope
   `bot`, permissions nécessaires à la synchronisation des membres et aux messages
   privés).
5. Récupérer l'**ID du serveur** (Paramètres Discord → Avancés → Mode développeur, puis
   clic droit sur le serveur → *Copier l'identifiant*) → `DISCORD_GUILD_ID`.
6. Récupérer votre **ID Discord** (clic droit sur votre pseudo → *Copier l'identifiant*)
   → `ADMIN_DISCORD_IDS`.

## 2. Se connecter au registre privé

L'image est privée. Créer un **Personal Access Token (classic)** GitHub avec la portée
`read:packages`, puis :

```bash
echo "VOTRE_PAT" | docker login ghcr.io -u kesurof --password-stdin
```

## 3. Fichiers

Récupérer `docker-compose.yml` et `.env.example` du dépôt, puis :

```bash
cp .env.example .env
# éditer .env
```

### Variables `.env`

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | oui | `file:/data/sfr.db` — la base vit sur le volume persistant |
| `AUTH_SECRET` | oui | `openssl rand -base64 32` |
| `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` | oui | application OAuth2 Discord |
| `DISCORD_GUILD_ID` | oui | ID du serveur Discord |
| `DISCORD_BOT_TOKEN` | oui | token du bot (Server Members Intent) |
| `ADMIN_DISCORD_IDS` | oui | IDs admin séparés par des virgules |
| `ENCRYPTION_KEY` | oui | `openssl rand -base64 32` (32 octets) — chiffre les clés stockées |
| `NEXTAUTH_URL` | oui | URL publique **https** ; doit correspondre à la redirect Discord |
| `AUTH_TRUST_HOST` | oui | `true` derrière un reverse proxy |
| `DISCORD_INVITE_URL` | non | lien affiché aux comptes hors serveur |
| `TRUST_PROXY` | non | `true` si un proxy renseigne `X-Forwarded-For` |
| `RATE_LIMIT_*` | non | quotas du lien de récupération (défauts raisonnables) |

Après le premier déploiement, créer un webhook entrant Discord dans le salon cible,
copier son URL, puis ouvrir `/admin?view=settings` et la renseigner. L’URL est
chiffrée dans la base SQLite et n’est pas ajoutée à `.env`.

## 4. Lancer

```bash
docker compose up -d
docker compose logs -f
```

Au démarrage, le conteneur applique les migrations Prisma sur `/data/sfr.db` puis
sert l'application sur son port interne `3000`. Le Compose utilise `expose` et
ne publie aucun port sur l'hôte. Placer un reverse proxy (Traefik, Caddy,
Nginx…) sur le même réseau Docker pour l'accès HTTP/TLS, ou utiliser Coolify
(voir `COOLIFY.md`) ; Coolify route alors chaque domaine vers le port interne
`3000` sans mapping public.

Le volume `sfr_data` conserve la base entre les mises à jour.

## 5. Mise à jour

```bash
docker compose pull
docker compose up -d
```

## 6. Sauvegarde / restauration

```bash
# sauvegarde
docker compose cp sfr-r2:/data/sfr.db ./sfr-$(date +%F).db

# restauration (conteneur arrêté)
docker compose stop
docker compose cp ./sfr-2026-01-01.db sfr-r2:/data/sfr.db
docker compose start
```

Conserver aussi une copie sûre de `.env`, en particulier de `ENCRYPTION_KEY` : sans
cette clé, les clés d’accès présentes dans une sauvegarde SQLite ne peuvent pas être
déchiffrées.

## 7. Promouvoir un administrateur

Ajouter l'ID Discord à `ADMIN_DISCORD_IDS` dans `.env`, puis `docker compose up -d`.
