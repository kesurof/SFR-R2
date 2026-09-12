# ADR 0002 — Remplacement transactionnel des clés

Statut : accepté

## Contexte

Une clé active peut devenir inutilisable ou devoir être renouvelée. La révocation
existante retire l'accès mais ne permet pas au membre de formaliser une demande ni
de fournir aux administrateurs le contexte nécessaire au traitement.

## Décision

Créer un modèle `KeyReplacementRequest` distinct des demandes d'accès initiales et
des demandes de parrainage. La demande est liée à l'utilisateur et à la clé active
présente au moment de sa création. Un seul statut `PENDING` est autorisé par membre.

Les administrateurs traitent la demande dans `/admin?view=keys`. Le remplacement
révoque la clé ciblée et crée la nouvelle clé chiffrée dans la même transaction,
avant de marquer la demande `COMPLETED`. Un refus avec motif marque la demande
`REJECTED` sans modifier la clé actuelle.

Les notifications Discord sont mises en file comme les autres notifications. Le
DM administrateur contient un lien direct vers la demande, son motif et une
empreinte de clé ; aucune clé en clair n'est incluse.

## Conséquences

- Les deux parcours de délivrance existants peuvent demander un remplacement sans
  fusionner leurs statuts métier.
- Une migration ajoute la table des demandes et les références de traçabilité dans
  les notifications et les audits.
- Une demande traitée peut être renouvelée plus tard, tandis qu'une demande en
  attente bloque les doublons pour le même membre.
- Les notifications restent non bloquantes et respectent la configuration globale
  des notifications Discord.

## Alternatives écartées

- Réutiliser `AccessRequest` ou `SponsorshipRequest` : ces modèles décrivent la
  délivrance initiale et leurs statuts ne représentent pas un remplacement.
- Révoquer automatiquement la clé à la soumission : le membre conserverait son
  accès jusqu'à la décision de l'administrateur.
- Envoyer la nouvelle clé par DM : le portail conserve le mécanisme existant de
  récupération à usage unique et évite d'exposer un secret dans les notifications.
