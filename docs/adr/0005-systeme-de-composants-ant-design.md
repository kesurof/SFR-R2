# ADR 0005 — Introduction d'Ant Design 6 comme système de composants

Statut : accepté

## Contexte

L'interface repose aujourd'hui sur du markup natif et environ 300 lignes de
`app/globals.css` : boutons, champs, badges, panneaux, onglets, dialogues et toasts
maison. Le besoin est de standardiser les composants, la gestion des formulaires, des
notifications et de l'accessibilité, tout en conservant une identité visuelle et un
thème clair/sombre persistés.

Ant Design 6 est stable, s'appuie sur des variables CSS, requiert React ≥ 18 et
dispose de `@ant-design/nextjs-registry`, compatible Next.js 16, pour l'extraction du
style au premier rendu. Une validation technique (Next 16.3, Turbopack, `standalone`,
antd 6.6, registry 1.3) a produit une sortie serveur correcte.

## Décision

Introduire `antd@6`, `@ant-design/icons@6` et `@ant-design/nextjs-registry`, et
adopter les composants cœur suivants :

- `ConfigProvider` (jetons de thème, locale `fr_FR`) et `App` pour `message`,
  `notification` et `Modal` ;
- `Layout` et `Menu` pour la structure globale (à la place de l'AppShell maison) ;
- `Button` (avec `loading`), `Popconfirm`, `Modal`, `Drawer`, `Descriptions`, `Tag`,
  `Table` et les icônes `@ant-design/icons`.

Les composants cœur remplacent les équivalents maison. Le schéma de thème est dérivé
de `app/globals.css` ; la clé `sfr-theme`, le script anti-FOUC et le basculement
clair/sombre sont conservés comme source de vérité unique. `globals.css` est réduit
aux styles sans équivalent (révélation de clé, chronologie, puces de rôle).

Les tests de composants utilisent `@testing-library/react` et `jsdom`, avec les
polyfills requis par Ant Design (`matchMedia`, `ResizeObserver`, `MessageChannel`).

## Conséquences

- Les composants Ant Design sont des composants client : les frontières
  serveur/client sont réévaluées page par page.
- Le poids de l'image augmente (Ant Design et ses dépendances) ; la sortie
  `standalone` doit confirmer l'inclusion correcte.
- La CSP à nonce reste valide : `style-src 'unsafe-inline'` autorise le style injecté,
  sans script inline supplémentaire.
- Le catalogue des composants réutilisables et l'architecture actuelle sont mis à jour
  après livraison.
- Les tests de règles pures restent inchangés ; des tests de composants sont ajoutés.

## Alternatives écartées

- **Pro Components 3 (`ProLayout`, `ProTable`)** : version pré-release, peers de
  sous-paquets incompatibles avec antd 6 et bug runtime connu (`useLazyKVMap`) avec les
  imports dynamiques.
- **shadcn/ui ou Radix** : couche de composants à assembler sans gain de contrat face à
  Ant Design pour ce périmètre.
- **Conserver le design system maison** : ne répond pas au besoin de standardisation,
  d'accessibilité et de formulaires.
- **Mode CSS-in-JS par défaut sans registry** : provoque un flash de style au premier
  rendu ; `@ant-design/nextjs-registry` est retenu.
