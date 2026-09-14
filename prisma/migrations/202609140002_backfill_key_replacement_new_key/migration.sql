-- Les demandes de remplacement finalisées avant l'ajout de `newKeyId` (migration
-- 202609140001) sont rattachées à leur clé ciblée, donc à une clé révoquée. On
-- rétablit le lien vers la clé effectivement créée, tracée par l'audit.
UPDATE "KeyReplacementRequest"
SET "newKeyId" = (
  SELECT a."keyId" FROM "AuditLog" a
  WHERE a."event" = 'ACCESS_KEY_REPLACED'
    AND a."replacementRequestId" = "KeyReplacementRequest"."id"
  LIMIT 1
)
WHERE "status" = 'COMPLETED'
  AND "newKeyId" IS NULL
  AND EXISTS (
    SELECT 1 FROM "AuditLog" t
    WHERE t."event" = 'ACCESS_KEY_REPLACED'
      AND t."replacementRequestId" = "KeyReplacementRequest"."id"
  );
