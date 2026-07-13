# ASCENT — Plan d'architecture (Phase 1)

> RPG personnel qui gamifie le training et l'évolution perso. App solo, hardcodée
> pour un seul joueur, finition niveau production. Ce document est le plan à
> valider AVANT tout build. Aucun code tant que design + data ne sont pas validés.

---

## 1. Directions esthétiques (choisir 1)

Trois identités distinctes, toutes sur base sombre, énergie maîtrisée, feedback
"progression qui glow". Aucune ne réutilise la palette yacht navy/or/crème.

### Direction A — **VOLT PROTOCOL** (tactical HUD) ⭐ recommandée

- **Ambiance** : interface d'opérateur. Le training traité comme une mission :
  froid, précis, dense en data, et le glow volt n'apparaît QUE quand tu progresses
  — la couleur est une récompense, pas une décoration. Grille suisse stricte,
  beaucoup de noir, fines lignes techniques, scanlines discrètes sur les
  transitions.
- **Palette** :
  - Fond : `#0A0B0D` (graphite quasi-noir) / surfaces `#111318`
  - Lignes & texte secondaire : `#3A3F4A` / `#9AA3B2`
  - Accent unique : **volt** `#C8FF00` (XP, level-up, records)
  - Sémantique discrète : danger `#FF4D4D`, zone 2 `#4DA6FF` — désaturés à 80%
- **Typo** : Space Grotesk (display/titres) + Inter (UI) + **JetBrains Mono pour
  TOUS les chiffres** (poids, chronos, XP) — les nombres sont les héros.
- **Game feel** : HUD de Destiny 2 / The Division, ergonomie d'une Garmin.
  Micro-interactions sèches et rapides (150–250ms), glow volt en bloom sur les
  gains d'XP, tick-tick-tick des compteurs qui montent.
- **Pourquoi recommandée** : c'est l'identité la plus alignée avec Hyrox/lactate/
  VO2max — un jeu d'athlète, pas un jeu d'heroic fantasy. Et l'accent unique
  rend le "glow de progression" réellement signifiant.

### Direction B — **EMBER RITE** (dark fantasy de forge)

- **Ambiance** : chaque séance est un rituel, chaque stat une rune. Obsidienne,
  braise, métal chauffé. Les stats qui montent "chauffent" (gradient braise qui
  s'intensifie). Textures grain/noise subtiles, vignettage, lumière qui émane
  des éléments actifs.
- **Palette** :
  - Fond : `#0C0A0E` (obsidienne violacée) / surfaces `#16121A`
  - Braise : gradient `#FF6B2C → #FFB454` (XP, progression)
  - Arcane : `#8B5CF6` (modifiers roguelike, rare/épique)
  - Texte : `#E8E3DB` (os) / `#7A7284`
- **Typo** : Clash Display (titres, anguleux et massif) + Satoshi (UI). Chiffres
  en tabular nums de Satoshi.
- **Game feel** : Hades (juice, punch des recaps) × Diablo IV (gravité, rareté
  des loots). Animations plus lentes et physiques (spring, overshoot), particules
  de braise sur les level-ups.
- **Risque** : plus dur à tenir premium — le dark fantasy tombe vite dans le
  cliché si l'exécution n'est pas parfaite.

### Direction C — **CHROME PULSE** (cyber-athlète holographique)

- **Ambiance** : laboratoire de performance du futur. Verre fumé, chrome,
  iridescence. L'avatar est un "spécimen" qu'on améliore. Glassmorphism maîtrisé
  (2 niveaux max), gradients holographiques réservés aux moments de progression.
- **Palette** :
  - Fond : `#07080C` / surfaces verre `rgba(255,255,255,0.04)` + border `0.08`
  - Holo : gradient `#22D3EE → #A78BFA → #F472B6` (progression uniquement)
  - Accent actif : cyan `#22D3EE`
  - Texte : `#F1F5F9` / `#64748B`
- **Typo** : General Sans (UI) + Monument Extended ou Archivo Expanded (display
  large, très étiré) + tabular pour les chiffres.
- **Game feel** : menus de Cyberpunk 2077 × Tron: Legacy × l'app WHOOP si elle
  était un jeu. Shimmer iridescent qui traverse les barres d'XP, transitions
  en blur/depth.
- **Risque** : le glassmorphism holographique est la direction la plus "déjà vue"
  en 2026 — il faudra un twist fort pour rester distinctif.

---

## 2. Modèle de données (Supabase, Phase 1)

Principe clé : **l'XP est un ledger append-only** (`xp_events`). Les stats de
l'avatar sont une agrégation, jamais une valeur mutée — historique gratuit pour
les graphes, zéro désynchro, et les courbes de niveau peuvent être re-tunées
sans migration de données.

```sql
-- ============================================================
-- ENUMS
-- ============================================================
create type stat_key as enum (
  'force',       -- 💪 Force
  'engine',      -- 🫀 Moteur / Zone 2
  'skill',       -- 🤸 Skill gymnastique
  'discipline',  -- 🧘 Nutrition & sommeil
  'mental'       -- 🧠 Mental
);

create type workout_type as enum (
  'force', 'hypertrophie', 'fonctionnel',   -- ta lib force
  'zone2', 'hyrox', 'lactate', 'vo2max'     -- ta lib conditioning
);

create type run_status as enum ('rolled', 'active', 'completed', 'abandoned');

create type xp_source as enum ('run', 'checkin', 'bonus', 'quest', 'adjustment');

-- ============================================================
-- PROFIL (1 seule ligne, seedée — pas d'auth, pas de user_id)
-- ============================================================
create table profile (
  id            int primary key default 1 check (id = 1), -- singleton
  display_name  text not null,
  created_at    timestamptz not null default now(),
  -- baselines pour calibrer l'XP (ex: {"squat_1rm": 120, "z2_pace_kmh": 11})
  baselines     jsonb not null default '{}',
  -- réglages du moteur de jeu modifiables sans redeploy (courbes, multiplicateurs)
  game_config   jsonb not null default '{}'
);

-- ============================================================
-- BRIDGE TRAINING : ta lib de programmation ingérée ici
-- ============================================================
create table workout_templates (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,          -- 'force-a1', 'vo2max-4x4'...
  title          text not null,
  type           workout_type not null,
  -- structure de la séance telle que définie dans TA lib (blocs, exos,
  -- séries, cibles). Schéma jsonb documenté côté TypeScript (zod).
  blocks         jsonb not null,
  primary_stat   stat_key not null,             -- stat principalement nourrie
  -- répartition d'XP par stat, ex: {"force": 0.8, "mental": 0.2}
  stat_weights   jsonb not null,
  base_xp        int not null default 100,      -- XP de référence, avant modifiers
  source_ref     text,                          -- fichier/section d'origine dans ta lib
  archived_at    timestamptz                    -- soft delete, jamais de hard delete
);

-- ============================================================
-- ROGUELIKE : catalogue de modifiers + runs
-- ============================================================
create table modifier_defs (
  id           text primary key,                -- 'perfect_pacing', 'no_music'...
  name         text not null,
  description  text not null,
  rarity       text not null check (rarity in ('common','rare','epic')),
  -- effet mécanique, ex: {"xp_mult": 1.25, "condition": "all_sets_completed"}
  effect       jsonb not null,
  -- contraintes de tirage, ex: {"types": ["force","hypertrophie"]}
  roll_rules   jsonb not null default '{}',
  enabled      boolean not null default true
);

create table runs (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references workout_templates(id),
  status        run_status not null default 'rolled',
  -- modifiers tirés à la génération du run (snapshot des defs, pas des refs :
  -- un vieux run reste lisible même si le catalogue change)
  modifiers     jsonb not null default '[]',
  risk_tier     int not null default 0,         -- 0=safe, 1..3 = risque/récompense
  rolled_at     timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz,
  -- perf loggée : sets réalisés, temps, RPE, notes. Schéma zod côté client.
  performance   jsonb not null default '{}',
  -- verdict calculé à la complétion : {"score": 0.92, "xp_by_stat": {...},
  -- "modifiers_honored": [...], "prs": [...]} — snapshot immuable du recap
  outcome       jsonb
);

-- ============================================================
-- DISCIPLINE : check-in quotidien (nourrit 🧘 et un peu 🧠)
-- ============================================================
create table daily_checkins (
  day             date primary key,
  sleep_score     int check (sleep_score between 0 and 5),
  nutrition_score int check (nutrition_score between 0 and 5),
  note            text,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- XP LEDGER — source de vérité unique de toute progression
-- ============================================================
create table xp_events (
  id          bigint generated always as identity primary key,
  stat        stat_key not null,
  amount      int not null,                     -- peut être négatif (pénalité de risk)
  source      xp_source not null,
  run_id      uuid references runs(id),         -- si source = 'run'
  checkin_day date references daily_checkins(day),
  reason      text not null,                    -- lisible: "VO2max 4×4 complété, modifier ×1.25"
  created_at  timestamptz not null default now()
);

create index xp_events_stat_idx on xp_events (stat, created_at);

-- Vue d'agrégation : l'avatar. Le niveau est calculé côté TypeScript
-- (courbe: xp_total_pour_niveau(n) = round(100 * n^1.6)) pour rester tunable.
create view avatar_stats as
  select stat, coalesce(sum(amount), 0) as total_xp,
         count(*) filter (where source = 'run') as runs_count
  from xp_events group by stat;

-- ============================================================
-- PHASE 2 — PRÉVU, NON IMPLÉMENTÉ (placeholders volontairement absents)
-- seasons(id, name, starts_on, ends_on, boss jsonb)  → runs.season_id nullable
-- trophies(id, ...) + trophy_unlocks(...)            → alimentés par xp_events/outcome
-- Le ledger xp_events et runs.outcome contiennent déjà tout ce qu'il faut
-- pour reconstruire trophées et saisons rétroactivement.
-- ============================================================

-- RLS : app mono-utilisateur derrière une clé — RLS activée avec policy
-- "authenticated only" simple, accès via server-side client (service role
-- jamais exposé au navigateur ; toutes les écritures passent par des
-- Server Actions Next.js).
```

Décisions notables :
- **Pas de table `avatar`** : l'avatar EST la vue `avatar_stats`. Impossible à désynchroniser.
- **`runs.modifiers` et `runs.outcome` sont des snapshots** : l'historique reste vrai même si on rééquilibre le jeu.
- **`game_config` en jsonb** sur le profil : tuning des courbes/multiplicateurs sans redeploy.
- **Tout jsonb a un schéma zod côté TypeScript** — le typage vit dans `lib/engine/types.ts`.

---

## 3. Arborescence & ordre de build (Phase 1)

### Arbo (dossiers DISJOINTS par agent)

```
sport-rpg/
├── CLAUDE.md                    # possédé par le lead
├── .claude/agents/              # ui-design.md, game-engine.md, data.md
├── app/                         # LEAD (intégration) — les agents n'y touchent pas
│   ├── layout.tsx               # coquille, providers, PWA
│   ├── page.tsx                 # dashboard avatar (hub)
│   ├── run/
│   │   ├── new/page.tsx         # roll d'un run (choix séance + tirage modifiers)
│   │   ├── [id]/page.tsx        # run actif (log de la séance)
│   │   └── [id]/recap/page.tsx  # recap XP / level-up (le shot de dopamine)
│   └── checkin/page.tsx         # check-in discipline quotidien
├── components/                  # AGENT ui-design
│   ├── ui/                      # shadcn (générés, restylés via tokens)
│   ├── game/                    # StatHex, XPBar, RunCard, ModifierChip, LevelUpBurst...
│   └── motion/                  # primitives Motion réutilisables (Counter, GlowPulse...)
├── styles/                      # AGENT ui-design — tokens, globals.css, thème
├── lib/
│   ├── engine/                  # AGENT game-engine — PUR, zéro I/O, 100% testable
│   │   ├── xp.ts                # courbes de niveau, calcul des gains
│   │   ├── run-generator.ts     # tirage modifiers, risk tiers
│   │   ├── scoring.ts           # performance → outcome
│   │   └── types.ts             # schémas zod partagés (source de vérité des jsonb)
│   ├── data/                    # AGENT data — client Supabase, queries, Server Actions
│   └── training/                # AGENT data — parseur/bridge de TA lib de prog
├── supabase/                    # AGENT data — migrations/, seed.sql (profil + templates)
├── public/                      # manifest PWA, icônes
└── content/training/            # (si ingestion markdown) tes fichiers de prog
```

Frontière stricte : `lib/engine` ne connaît ni Supabase ni React ; `lib/data` ne
contient aucune règle de jeu ; `components` ne fait aucun fetch. Le lead assemble
tout dans `app/`.

### Ordre de build (séquentiel, agents jamais en parallèle sur les mêmes fichiers)

| Étape | Qui | Livrable | Gate de sortie |
|---|---|---|---|
| 0. Fondations | Lead | Scaffold Next 14 + TS + Tailwind + shadcn + Motion + PWA, CLAUDE.md, création des 3 agents | `pnpm build` vert |
| 1. Data | agent **data** | Migrations + seed (profil, templates depuis ta lib, modifiers) + client + Server Actions | seed appliqué, types générés |
| 2. Design system | agent **ui-design** | Tokens de la direction choisie, composants `game/` + `motion/`, restyle shadcn | page de démo des composants |
| 3. Game engine | agent **game-engine** | XP, générateur de runs, scoring — pur + tests unitaires | tests verts sur les courbes |
| 4. Intégration | Lead | Les 4 écrans branchés bout en bout, polish motion, PWA installable | boucle complète : roll → séance → recap → stats qui montent |

Parallélisme autorisé uniquement pour la recherche en lecture seule (ex : l'agent
ui-design explore des références pendant que data écrit les migrations — jamais
deux writers en même temps).

---

## 4. Questions ouvertes (à répondre avant le build)

1. **Ta lib de training — ingestion.** Sous quelle forme existe-t-elle
   aujourd'hui ? (a) fichiers markdown que tu déposes dans `content/training/`
   et que je parse en `workout_templates`, (b) tu me la colles dans le chat et
   je la seede en dur, (c) saisie via une UI d'admin minimale. Ma préférence :
   (a) ou (b) pour la Phase 1 — zéro UI d'admin à construire.
2. **Usage pendant la séance.** L'app est-elle ouverte À la salle pour logger
   en temps réel (gros boutons, chrono, mode une main, écran toujours allumé) ou
   remplis-tu le run APRÈS coup ? Ça change radicalement l'UX de l'écran de run.
3. **Les modifiers touchent-ils la vraie séance ?** Deux écoles : (a) purement
   scoring — "termine toutes les séries sans checker ton téléphone = ×1.25 XP",
   la prog reste intouchée ; (b) ils modifient la séance ("+1 round", "tempo 3-1-3").
   Je recommande (a) en Phase 1 : ta prog est sacrée, la variance vit dans le scoring.
4. **Stat Mental 🧠 — qu'est-ce qui la nourrit concrètement ?** Séances complétées
   en risk tier élevé ? Streaks ? Pratiques dédiées (froid, méditation) ? C'est la
   stat la plus floue du modèle, j'ai besoin de ta définition.
5. **Check-in discipline.** Un score 0–5 sommeil + 0–5 nutrition saisi à la main
   chaque jour te suffit-il en Phase 1 ? (Intégrations santé = Phase 2+.)
6. **Supabase.** Je crée un nouveau projet via le MCP Supabase (je te ferai
   confirmer le coût), ou tu as déjà un projet/org à utiliser ?
7. **Déploiement.** Vercel pour avoir l'URL installable en PWA sur ton téléphone ?
8. **Ton profil de départ.** Pour le seed : prénom/pseudo d'avatar, baselines
   (1RM approximatifs, allure Z2, date/objectif de ta prochaine Hyrox), et niveau
   de départ des 5 stats (tout à zéro, ou calibré sur ton niveau actuel ?).
9. **Langue de l'UI.** Tout en français ? (Les noms de modifiers/level-ups ont
   souvent plus de punch en anglais — je peux mixer : UI française, vocabulaire
   de jeu anglais.)

---

*Prochaine étape : tu valides une direction esthétique + le modèle de données
(+ réponses aux questions), puis je crée les 3 agents et on lance l'étape 0.*

---

## Annexe — Intégrations Phase 2+ (validées sur le principe, non implémentées)

- **Whoop** : l'API Whoop (OAuth) expose recovery, sommeil, strain, HRV, FC repos.
  Brancher = un `WhoopSource` côté serveur qui alimente `daily_checkins`
  (sommeil auto-scoré) et un futur "readiness" qui module la mission du jour
  (recovery < 33% → l'app propose la Z2 ou le Recovery Protocol à la place du
  VO2max). Prérequis : Supabase branché (les tokens OAuth ne vivent pas dans
  localStorage) — c'est le déclencheur naturel du chantier persistance.
- **Agenda (Google Calendar)** : lecture des événements pour détecter les jours
  chargés/jours de mer à l'avance, proposer le créneau d'entraînement du jour
  (chaleur → créneau tôt), et pousser la mission planifiée dans le calendrier.
  Même prérequis serveur que Whoop.
- Dans les deux cas, l'UI ne change pas : ces sources écrivent dans le même
  ledger `xp_events` / les mêmes tables que la saisie manuelle.
- **Oracle (l'Analyste)** : troisième persona (après les handlers Goggins/Robbins).
  Aujourd'hui rule-based (`lib/engine/analyst.ts`) sur le ledger local : momentum
  XP, adhérence journal, projection épargne, écarts PR→cibles, directive de
  semaine. Évolution prévue : mêmes sections nourries par Whoop (corrélations
  habitudes ↔ récupération) puis génération LLM du débrief via API — l'interface
  `buildReport(inputs) → Report` est le point d'extension.
