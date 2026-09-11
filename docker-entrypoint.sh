#!/bin/sh
set -e

# Applique les migrations Prisma sur la base SQLite du volume, sans embarquer la
# CLI Prisma (≈ 150 Mo) : on rejoue les fichiers migration.sql dans l'ordre et on
# trace l'état dans la même table `_prisma_migrations` que `prisma migrate deploy`.

DB_PATH="${DATABASE_URL#file:}"
: "${DB_PATH:?DATABASE_URL doit être de la forme file:/chemin/base.db}"
mkdir -p "$(dirname "$DB_PATH")"

sqlite3 "$DB_PATH" "CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id                      TEXT PRIMARY KEY NOT NULL,
  checksum                TEXT NOT NULL,
  finished_at             DATETIME,
  migration_name          TEXT NOT NULL,
  logs                    TEXT,
  rolled_back_at          DATETIME,
  started_at              DATETIME NOT NULL DEFAULT current_timestamp,
  applied_steps_count     INTEGER UNSIGNED NOT NULL DEFAULT 0
);"

for dir in ./prisma/migrations/*/; do
  [ -f "$dir/migration.sql" ] || continue
  name=$(basename "$dir")
  done_count=$(sqlite3 "$DB_PATH" \
    "SELECT count(*) FROM _prisma_migrations WHERE migration_name='$name' AND finished_at IS NOT NULL;")
  if [ "$done_count" = "0" ]; then
    echo "→ migration $name"
    sqlite3 "$DB_PATH" < "$dir/migration.sql"
    checksum=$(sha256sum "$dir/migration.sql" | cut -d' ' -f1)
    uuid=$(cat /proc/sys/kernel/random/uuid)
    sqlite3 "$DB_PATH" "INSERT INTO _prisma_migrations
      (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
      VALUES ('$uuid', '$checksum', '$name', current_timestamp, current_timestamp, 1);"
  fi
done

exec node server.js
