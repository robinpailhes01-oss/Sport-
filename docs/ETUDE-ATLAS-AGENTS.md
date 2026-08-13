# ÉTUDE — Atlas corporel & Agents personnalisés

> Étude approfondie demandée par l'opérateur : rendre ASCENT ultra-personnalisable,
> facile à suivre, facile à partager, avec une cartographie réelle du corps
> (zones fortes/faibles selon les entraînements, poids, taille) et des agents IA
> qui le connaissent par cœur. Ce document est la référence à valider avant build.

---

## 0. Principes non négociables

1. **Réalisme = données réelles.** Aucune "analyse" inventée : chaque couleur,
   chaque conseil, chaque zone faible affichée doit être traçable jusqu'à une
   donnée saisie (série, charge, poids de corps, scan, mood). Si la donnée
   n'existe pas, l'app dit "pas encore mesuré" — jamais du flou plausible.
2. **La friction est l'ennemi n°1.** Chaque nouvelle donnée demandée doit coûter
   moins d'une seconde à saisir dans 90% des cas (pré-remplissage + 1 tap).
   Une app qu'on ne remplit pas devient fausse, donc inutile.
3. **Le volt reste une récompense.** L'atlas, les cartes de partage et les
   rapports suivent la grammaire Volt Protocol existante.
4. **Le partage ne montre jamais la mécanique de jeu** (XP, tiers, modifiers) —
   principe déjà validé sur la carte de partage actuelle.

---

## 1. Le profil opérateur — la racine de toute personnalisation

Nouvelle table `operator_profile` (une seule ligne, app solo) :

| Champ | Usage |
|---|---|
| `height_cm`, `birthdate` | ratios ×BW, contexte agents |
| `weight_kg` (+ table `weigh_ins` datée) | tendance de poids, e1RM relatif, cartes |
| `equipment_context` | `"gym"` / `"bateau"` / `"minimal"` — les séances générées s'y adaptent |
| `time_budget_min` | durée max de séance acceptable un jour donné |
| `goal_primary` | `"hybride-hyrox"` / `"force"` / `"physique"` — pondère les propositions |
| `constraints` (texte libre) | "chaleur 11h-17h", "jours de mer imprévisibles", blessures |

Le poids se saisit en 5 secondes depuis le dashboard (comme l'heure
d'entraînement) : champ + historique. La taille une fois dans /reglages.

**Pourquoi c'est la racine :** tout le reste (ratios de force, atlas, séances
générées, ton des agents) lit ce profil. Aujourd'hui les agents ne savent même
pas combien tu pèses.

---

## 2. Suivi ultra-simple — le logging qui ne coûte rien

### 2.1 Le référentiel exercices

Table statique `EXERCISES` (dans le code, comme `MOVEMENTS`) : ~40 exercices
couvrant les 9 templates actuels + les variantes bateau. Chaque exercice :

```
{ key, label, muscles: { primary: ["quadriceps","fessiers"], secondary: ["lombaires"] },
  pattern: "squat" | "hinge" | "push-v" | "push-h" | "pull-v" | "pull-h" | "carry" | "core" | "mono" }
```

Les groupes musculaires (14) : quadriceps, ischios, fessiers, mollets, lombaires,
abdos/core, pectoraux, dorsaux, trapèzes, épaules, biceps, triceps, avant-bras,
cardio (pseudo-groupe pour les blocs d'engine).

### 2.2 La saisie en 1 tap (le cœur de l'étude UX)

Pendant un run actif, chaque bloc de force affiche ses séries **pré-remplies**
avec la performance de la dernière séance identique + la suggestion de surcharge :

```
A. BACK SQUAT            dernier : 5×3 @ 100 kg
  ▸ Série 1   [102,5 kg] × [3]   ✓   ← valeurs proposées, tap = validé tel quel
  ▸ Série 2   [102,5 kg] × [3]   ✓      ajuster = tap sur le chiffre, molette
  ...
```

- **Cas nominal (90%) : 1 tap par série.** La suggestion applique une
  progression simple double (reps d'abord, puis +2,5 kg quand le haut de la
  fourchette est atteint).
- **Cas ajustement : 2 taps** (molette de charge par pas de 2,5 kg).
- Première fois sur un exercice : saisie libre, qui devient la référence.
- Les blocs cardio/skill gardent la coche simple actuelle (la donnée fine y
  vaut moins cher que la friction qu'elle coûterait).

Table `set_logs` : `(run_id, exercise_key, set_index, weight_kg, reps, rpe?, created_at)`.
C'est **la** table qui alimente l'atlas, les e1RM et les agents.

### 2.3 Ce qu'on calcule automatiquement (zéro saisie)

- **e1RM** par exercice : formule d'Epley `poids × (1 + reps/30)`, lissée sur
  les 3 meilleures séries des 30 derniers jours. Jamais besoin de tester un max.
- **Tonnage hebdo par muscle** : Σ (poids × reps × implication) — implication
  1.0 muscle primaire, 0.5 secondaire.
- **Stagnation** : e1RM plat (±2%) sur 4 semaines → signalé.
- **Ratios de référence** : squat/DL, tirage/poussée, ×BW — comparés aux cibles
  déjà définies dans `records.ts`.

---

## 3. L'atlas corporel — zones fortes et faibles

### 3.1 Le rendu

Un **écran Atlas** (`/atlas`) avec un corps SVG stylisé HUD (face + dos,
14 zones cliquables) coloré par un **score de zone** :

```
score_zone = f(volume relatif 4 sem., progression e1RM, équilibre vs zone opposée)
  → surchargée (volt vif) / solide (volt) / entretenue (neutre) / négligée (rouge désaturé)
```

Tap sur une zone → détail : exercices qui la nourrissent, e1RM et tendance,
volume hebdo, dernier PR, et la recommandation ("ischios à 40% du volume
quadris — ajouter 1 accessoire hinge/sem").

### 3.2 Le lien avec tes photos

Les scans utilisent déjà une **pose standardisée** (silhouette-guide) — c'est ce
qui rend possible un **overlay honnête** sans IA d'analyse d'image : en mode
"calque", la carte musculaire semi-transparente se superpose à ta photo de scan
(même cadrage face/dos), alignée manuellement une fois par un pinch-zoom.
La photo montre le réel, le calque montre la donnée — l'app ne prétend jamais
"lire" ton corps sur la photo.

### 3.3 Poids et taille dans l'atlas

Bandeau haut : poids courant + tendance 30 j (flèche), IMC discret, et les
3 ratios ×BW clés vs cibles. Le poids contextualise tout (un e1RM qui stagne
pendant une perte de poids n'est PAS une stagnation — les agents le savent).

---

## 4. Partage — 3 cartes, zéro mécanique de jeu

Extension du moteur canvas existant (`lib/share/card.ts`), même DA :

1. **Carte PR** — mouvement, charge, delta vs précédent, date. Déjà proche de
   l'existant.
2. **Carte Avant/Après** — deux scans côte à côte + delta de poids + période.
   Générée depuis le comparateur existant.
3. **Carte Atlas** — le corps SVG coloré + 2-3 stats clés (poids, meilleur
   ratio, zone la plus progressée). L'atlas est fait pour être posté en réel.

Chaque carte : bouton partage natif (Web Share API, fallback téléchargement) —
mécanique déjà en place.

---

## 5. Les agents personnalisés — architecture d'étude

### 5.1 Le problème actuel

Les agents (COMMS) reçoivent un contexte figé et généraliste : score, streak,
stat faible, épargne. Ils ne savent ni ton poids, ni tes charges, ni ce qui a
marché pour toi le mois dernier. Ils réagissent, ils ne programment pas.

### 5.2 Le contexte unifié (`buildOperatorContext()`)

Une seule fonction serveur assemble TOUT ce que l'app sait, versionnée et
réutilisée par chaque appel IA :

```
profil (taille, poids+tendance, objectif, équipement, contraintes)
+ protocole (jour, phase, adhérence 4 sem. : séances prévues vs faites)
+ force (e1RM par exercice + tendances, tonnage par muscle, stagnations, ratios)
+ récup (mood récents, jours de mer, heure déclarée ; Whoop quand branchée)
+ mémoire (agent_notes — voir 5.4)
+ records, journal, épargne (existant)
```

### 5.3 Le pipeline de programmation (qui fait quoi)

| Moment | Agent | Sortie |
|---|---|---|
| **Dimanche soir** | Oracle | *Revue hebdo* : bilan de la semaine + proposition de semaine suivante (mesocycle) — tu valides/modifies bloc par bloc |
| **Chaque jour** | Coach propriétaire du type de séance | *Séance du jour* générée : blocs, séries, charges cibles (depuis e1RM), durée adaptée au time_budget — stockée comme template dynamique |
| **Après la séance** | Coach du jour | *Débrief* : 2 phrases sur la perf réelle (blocs faits, RPE vs prévu) + écrit une note mémoire si pattern détecté |

Sortie structurée (schéma JSON validé, comme COMMS) → table `custom_templates`
compatible avec le format `WorkoutTemplate` existant : **l'UI de run actuelle
fonctionne sans modification** avec les séances générées.

### 5.4 La mémoire qui s'auto-améliore (`agent_notes`)

Table : `(id, author, category, note, evidence, created_at, retired_at?)`.
Catégories : `preference` ("préfère 5×5 à 5×3"), `response` ("progresse vite au
strict press"), `constraint` ("vendredi souvent sauté — jour de mer"),
`caution` ("RPE sous-estimé sur le squat").

- **Écriture** : uniquement par les agents, au débrief ou à la revue hebdo,
  avec `evidence` obligatoire (les données qui justifient la note).
- **Consolidation mensuelle** : un job IA fusionne/retire les notes (max ~30
  actives) — c'est l'anti-dérive : la mémoire reste courte, sourcée, à jour.
- **Boucle d'évaluation** : l'adhérence réelle (séance faite ? blocs complets ?
  RPE proche du prévu ?) est LA métrique de qualité d'un plan généré. Un plan
  sur-ambitieux non suivi = signal d'apprentissage, consigné.

### 5.5 Garde-fous

- Progression plafonnée (+5% de charge max/semaine par exercice) — l'IA propose,
  les règles du moteur bornent. Jamais de séance générée hors limites.
- Deload automatique proposé toutes les 4-5 semaines ou si adhérence < 60%.
- Tu restes le décideur : toute semaine générée est validée avant d'entrer au
  programme ; modifier un bloc est un tap.

---

## 6. Schéma de données (migration 0004, résumé)

```
operator_profile (1 ligne)      weigh_ins (date, kg)
set_logs (run_id, exercise_key, set_index, weight_kg, reps, rpe?)
custom_templates (semaine ISO, jour, template JSON, status: proposed|accepted|done)
agent_notes (author, category, note, evidence, retired_at?)
```

Tout en RLS verrouillé service_role, comme l'existant.

---

## 7. Roadmap (ordre strict, chaque palier utilisable seul)

| # | Palier | Contenu | Dépend de |
|---|---|---|---|
| 1 | **Fondation** | profil opérateur + pesées + référentiel exercices + saisie 1-tap des séries dans le run | — |
| 2 | **Atlas** | écran /atlas (SVG 14 zones, scores réels), e1RM/tonnage/stagnations, overlay scan | 1 |
| 3 | **Cartes** | PR / Avant-Après / Atlas partageables | 2 |
| 4 | **Agents 2.0** | contexte unifié + séance du jour générée + revue hebdo dimanche | 1 (2 enrichit) |
| 5 | **Mémoire** | agent_notes + débrief post-séance + consolidation | 4 |

Palier 1 = le seul qui change ta routine (saisir tes charges). Tout le reste
est du rendu et de l'intelligence par-dessus — c'est pour ça qu'il part en
premier et qu'il doit être parfait en friction.
