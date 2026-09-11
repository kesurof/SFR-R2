# ---------- deps : dépendances complètes (le build en a besoin) ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- builder : prisma generate + next build (standalone) ----------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runner : image finale, minimale, non-root ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# `sqlite` sert uniquement à appliquer les migrations au démarrage (voir docker-entrypoint.sh).
RUN apk add --no-cache sqlite

# Sortie "standalone" : server.js + runtime Next tracé + @prisma/client + moteur de requête.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma/migrations ./prisma/migrations
COPY --chmod=0755 docker-entrypoint.sh ./docker-entrypoint.sh

# Seuls /data (volume) et le cache Next doivent être accessibles en écriture par `node`.
RUN mkdir -p /data /app/.next/cache \
 && chown node:node /data /app/.next /app/.next/cache
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1
ENTRYPOINT ["/app/docker-entrypoint.sh"]
