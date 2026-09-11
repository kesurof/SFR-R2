# Déploiement — Coolify

Prérequis : l'application Discord est configurée (voir
[`DEPLOIEMENT.md` §1](DEPLOIEMENT.md)).

## 1. Déclarer le registre privé GHCR

L'image `ghcr.io/kesurof/sfr-r2-public` est privée.

1. Créer un **Personal Access Token (classic)** GitHub avec la portée `read:packages`.
2. Coolify → **Keys & Tokens → Registries** (ou *Sources*) → **Add** :
   - URL : `ghcr.io`
   - Username : `kesurof`
   - Password : le PAT

## 2. Créer la ressource

**Option A — Docker Compose (recommandé)**

*Project → New Resource → Docker Compose*. Coller :

```yaml
services:
  sfr-r2:
    image: ghcr.io/kesurof/sfr-r2-public:latest
    restart: unless-stopped
    ports:
      - "3000"
    volumes:
      - sfr_data:/data
volumes:
  sfr_data:
```

**Option B — Docker Image**

*New Resource → Docker Image* → `ghcr.io/kesurof/sfr-r2-public:latest`, port interne `3000`.

## 3. Stockage persistant

**Storages → Add** : volume monté sur `/data` (nom au choix, ex. `sfr_data`).
C'est là que vit `sfr.db`.

> Si Coolify utilise un *bind mount* plutôt qu'un volume nommé, s'assurer que le
> dossier hôte est accessible en écriture par l'UID `1000` (l'image tourne en
> utilisateur non-root `node`) : `chown -R 1000:1000 /chemin/hote`.

## 4. Variables d'environnement

Onglet **Environment Variables**, mêmes clés que `.env.example` :

- `DATABASE_URL=file:/data/sfr.db`
- `AUTH_SECRET`, `ENCRYPTION_KEY` — `openssl rand -base64 32`
- `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET`, `DISCORD_GUILD_ID`, `DISCORD_BOT_TOKEN`
- `ADMIN_DISCORD_IDS`
- `NEXTAUTH_URL` = l'URL https publique attribuée par Coolify (étape 5)
- `AUTH_TRUST_HOST=true`
- `TRUST_PROXY=true`
- `DISCORD_INVITE_URL` (optionnel)

Après le premier déploiement, créer un webhook entrant Discord dans le salon cible,
copier son URL, puis ouvrir `/admin?view=settings` et la renseigner. L’URL est
chiffrée dans la base SQLite et ne doit pas être ajoutée aux variables Coolify.

## 5. Domaine et HTTPS

Onglet **Domains** → renseigner le domaine ; Coolify gère le certificat.
Puis **reporter cette URL** :

- dans la variable `NEXTAUTH_URL`
- dans les **Redirects** OAuth2 de l'application Discord :
  `https://VOTRE-DOMAINE/api/auth/callback/discord`

## 6. Déployer

**Deploy**. Le conteneur applique les migrations puis démarre. Le *healthcheck*
intégré (`GET /`) permet à Coolify de suivre l'état.

## 7. Mises à jour

À chaque publication d'un nouveau `:latest` (push sur `main` du dépôt) :
**Redeploy** dans Coolify — ou brancher un webhook GitHub → Coolify pour l'automatiser.
