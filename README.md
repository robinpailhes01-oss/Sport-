# ASCENT

RPG personnel qui gamifie le training. App solo, mono-joueur, direction
esthétique **Volt Protocol** (tactical HUD). Voir `PLAN.md` pour l'architecture
complète et la roadmap.

## Lancer en local

```bash
npm install
npm run dev
# → http://localhost:3000
```

## État actuel — Phase 1 "interface d'abord"

- **Dashboard avatar** (`/`) : radar des 5 stats, niveaux, XP, log récent.
- **Boucle roguelike** : `/run/new` (séance + risk tier + roll de modifiers)
  → `/run/[id]` (run actif : chrono, blocs, RPE) → `/run/[id]/recap` (XP, level ups).
- **Données 100% mock** : `lib/data/mock.ts` (in-memory + localStorage).
  L'UI ne parle qu'à l'interface `DataSource` (`lib/data/source.ts`) —
  brancher Supabase = écrire une `SupabaseDataSource`, zéro retouche des écrans.
- Pour réinitialiser la partie : effacer la clé `ascent-save-v1` du localStorage.

## Architecture

| Dossier | Rôle |
|---|---|
| `app/` | Écrans (App Router) — intégration uniquement |
| `components/ui` `game` `motion` `hud` | Design system Volt Protocol + composants de jeu |
| `lib/engine/` | Règles du jeu, pures (courbes XP, générateur de runs, scoring) |
| `lib/data/` | Persistance derrière l'interface `DataSource` (mock aujourd'hui, Supabase demain) |
