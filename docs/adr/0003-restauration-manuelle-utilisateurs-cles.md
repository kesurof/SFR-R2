# ADR 0003 — Restauration manuelle des utilisateurs et des clés

Statut : accepté

## Contexte

Une perte de données peut supprimer l'historique des demandes alors que certains
utilisateurs disposent encore de leur Discord ID et de leur clé d'accès. Le portail
doit permettre de recréer ces accès sans fabriquer un historique qui n'est plus
disponible et sans exposer les secrets dans les traces applicatives.

La création d'une clé était également répétée dans plusieurs workflows, ce qui
risquait de faire diverger le chiffrement, le hash ou les métadonnées d'affichage.

## Décision

Ajouter un formulaire unitaire réservé aux administrateurs dans
`/admin?view=users`. Il accepte un Discord ID, un nom Discord, un pseudo serveur
facultatif et la clé complète.

L'opération récupère ou crée l'utilisateur, refuse la restauration si une clé active
existe déjà, puis crée une nouvelle clé active dans une transaction unique. Le
profil d'un utilisateur existant n'est pas écrasé : la synchronisation Discord reste
la source de vérité de ses informations.

La date de création de la clé correspond à la restauration. Aucun champ de date
historique ni d'origine n'est ajouté au schéma. Les événements
`USER_CREATED_MANUALLY` et `ACCESS_KEY_RESTORED_MANUALLY` distinguent la restauration
des workflows historiques.

La création chiffrée d'une clé est centralisée dans `lib/access-key.ts`. Le secret
est uniquement utilisé pour produire le chiffrement, le hash, le préfixe et le
suffixe ; il n'est jamais placé dans un audit, un log ou une notification.

## Conséquences

- Un administrateur peut restaurer rapidement un accès absent de l'historique.
- Une clé active existante ne peut pas être remplacée implicitement par cette action.
- Une restauration échouée ne conserve pas de données partielles.
- Les profils restaurés pourront être complétés par une synchronisation Discord ultérieure.
- Les clés restaurées sont immédiatement visibles dans la vue d'administration des clés.
- Les workflows existants réutilisent le même code de création de clé.
- La date originale de la clé n'est pas prétendue lorsque la source historique est perdue.

## Alternatives écartées

- **Import CSV en masse** : écarté pour cette première version, car le besoin est
  une restauration contrôlée et unitaire avec validation et audit par utilisateur.
- **Remplacement automatique d'une clé active** : écarté pour éviter une révocation
  implicite ; le parcours de remplacement existant reste explicitement séparé.
- **Autoriser plusieurs clés actives** : écarté, car le modèle métier conserve une
  seule clé active par utilisateur.
- **Ajouter une date d'émission historique au schéma** : écarté, car cette donnée
  n'est pas fiable après la perte de l'historique.
- **Réutiliser directement `saveKey`** : écarté, car ce workflow impose une demande
  approuvée et ne couvre pas la restauration d'un utilisateur sans demande.
