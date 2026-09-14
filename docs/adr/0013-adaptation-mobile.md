# ADR 0013 — Adaptation mobile sans modifier le desktop

Statut : accepté

## Contexte

Le portail était pensé pour un écran d'ordinateur : navigation dans un `Sider`,
tableaux larges en défilement horizontal, overlays de largeur fixe. L'usage sur
téléphone (naviguer, consulter et gérer les clés) devenait inconfortable.

Contrainte forte : les utilisateurs desktop sont satisfaits de l'interface actuelle,
qui ne doit pas régresser.

## Décision

Adopter une adaptation strictement conditionnée au breakpoint `lg` (992 px) :

- `useIsMobile` (`app/components/use-is-mobile.ts`) expose la présentation mobile en
  desktop-first : la valeur vaut `false` au rendu serveur et au premier rendu client,
  puis évolue après montage. Le desktop n'est donc jamais rendu en version mobile.
- Sous le breakpoint, `AppShell` remplace le `Sider` par un `Drawer` latéral (compte et
  déconnexion inclus) ; le `Sider` desktop reste inchangé.
- Les tables deviennent des cartes empilées via `MobileCardList`
  (`app/components/mobile-card-list.tsx`), avec pagination optionnelle. `List` d'Ant
  Design 6.6 étant déprécié au profit de `Listy`, cette brique maison évite d'introduire
  une API dépréciée.
- Les `Modal` et `Drawer` de détail adoptent une largeur adaptée à l'écran.
- Les actions de soumission passent en pleine largeur via la classe `.sfr-action`.

## Conséquences

- Aucune branche desktop n'est modifiée : les tables, colonnes, filtres et actions
  restent identiques au-dessus de `lg`.
- Le desktop ne subit aucun « flash » mobile ; sur mobile, un bref rendu desktop peut
  précéder la bascule, compensé par le montage immédiat du hook.
- Chaque table convertie possède une branche mobile dédiée, ce qui ajoute du markup
  mais reste local au domaine concerné.
- Aucune dépendance supplémentaire.

## Alternatives écartées

- CSS responsive seul (masquer des colonnes, garder le défilement horizontal) : ne
  répond pas au besoin d'une interface réellement adaptée au tactile.
- Introduire une bibliothèque de tableaux responsive supplémentaire : contredit la
  politique de dépendances et l'ADR 0005.
- Détection par `User-Agent` côté serveur : fragile, non fiable et difficile à tester.
- Adopter `Listy` : API plus bas niveau (pas de pagination intégrée) sans bénéfice pour
  ce besoin ; `MobileCardList` reste plus simple.
