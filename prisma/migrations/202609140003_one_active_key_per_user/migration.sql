-- Invariant métier : un membre ne peut avoir qu'une seule clé active à la fois.
-- Les parcours révoquent déjà l'ancienne clé avant d'en créer une nouvelle ; cet
-- index partiel rend l'invariant infalsifiable, même en cas de concurrence.
CREATE UNIQUE INDEX "one_active_key_per_user" ON "AccessKey"("userId") WHERE "status" = 'ACTIVE';
