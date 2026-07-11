# ASCENT — RPG de training personnel

App solo (un seul joueur, profil hardcodé, zéro auth) avec un niveau de finition
production. Direction esthétique validée : **VOLT PROTOCOL** — tactical HUD,
base graphite quasi-noire, accent volt `#C8FF00` réservé à la progression.
Le plan d'ensemble (modèle de données Supabase cible, roadmap Phase 2) est dans `PLAN.md`.

## Frontières d'architecture (strictes)

- `lib/engine/` — règles du jeu, **pur** : zéro I/O, zéro React, zéro Supabase. Testable unitairement.
- `lib/data/` — persistance derrière l'interface `DataSource` (`source.ts`).
  Implémentation actuelle : `MockDataSource` (localStorage). L'UI n'importe que `db()` depuis `lib/data`.
- `components/` — présentation ; aucun fetch, aucune règle de jeu.
- `app/` — assemblage des écrans uniquement.

## Conventions design (Volt Protocol)

- Le volt est une **récompense** : XP, level up, CTA primaire, records. Jamais décoratif.
- Tous les chiffres en `font-mono` (JetBrains Mono) + `tabular` ; titres en `font-display` (Space Grotesk) uppercase tracking large.
- Micro-labels : classe `hud-label`. Panneaux : composant `Panel` (ticks de coin).
- Animations Motion : ease maison `HUD_EASE` (`components/motion/primitives.tsx`), 150–500ms, sèches, sans rebond mou. Entrées de page via `Stagger`/`Rise`.
- Langue : UI en français, vocabulaire de jeu en anglais (run, level up, streak, XP, flawless).

## Discipline de scope

Phase 1 uniquement : avatar + 5 stats + boucle de run. Saisons/boss/trophées = Phase 2 —
prévus dans l'archi (ledger `xp_events`, snapshots dans `runs.outcome`), jamais implémentés sans validation.

## Vérification

`npm run build` doit rester vert. Pour vérifier visuellement : `npm run start` puis
Playwright/Chromium (`/opt/pw-browsers/.../chrome`) sur la boucle complète
dashboard → roll → run actif → recap.
