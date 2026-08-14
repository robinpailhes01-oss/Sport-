import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { EXERCISES } from "@/lib/engine/exercises";
import { STAT_KEYS, WORKOUT_TYPE_LABELS } from "@/lib/engine/types";

// Serveur uniquement. L'IA propose une séance ; les bornes du moteur
// l'encadrent. Elle ne peut pas inventer d'exercice hors référentiel (sinon
// l'atlas serait aveugle dessus), ni dépasser le budget temps, ni proposer
// une charge au-delà du plafond de progression.

const EXERCISE_KEYS = EXERCISES.map((e) => e.key) as [string, ...string[]];

export const GeneratedSessionSchema = z.object({
  title: z
    .string()
    .describe("Titre court en français, majuscules naturelles, ex: 'Force A — Lower'"),
  type: z
    .enum(Object.keys(WORKOUT_TYPE_LABELS) as [string, ...string[]])
    .describe("Type de séance"),
  durationMin: z.number().int().min(20).max(120),
  primaryStat: z.enum(STAT_KEYS as [string, ...string[]]),
  statWeights: z
    .record(z.enum(STAT_KEYS as [string, ...string[]]), z.number())
    .describe("Répartition de l'XP par stat, somme = 1"),
  author: z
    .enum(["goggins", "robbins"])
    .describe(
      "Coach qui signe : goggins pour moteur/mental/hyrox/crossfit, robbins pour force/hypertrophie/skill/recovery.",
    ),
  rationale: z
    .string()
    .describe(
      "2-3 phrases en français, tutoiement, dans la voix du coach : pourquoi CETTE séance aujourd'hui, en citant les données réelles qui la justifient.",
    ),
  blocks: z
    .array(
      z.object({
        name: z.string().describe("Ex: 'A. Back Squat'"),
        detail: z
          .string()
          .describe(
            "Prescription précise : séries × reps, charge ou %, repos, consigne technique.",
          ),
        exerciseKey: z
          .enum(EXERCISE_KEYS)
          .nullable()
          .describe(
            "Clé du référentiel si le bloc est un exercice chargé (active la saisie des séries). null pour le cardio, la gym et les blocs mixtes.",
          ),
        sets: z.number().int().min(1).max(10).nullable(),
        repsTarget: z.number().int().min(1).max(100).nullable(),
      }),
    )
    .min(3)
    .max(7),
});

export type GeneratedSession = z.infer<typeof GeneratedSessionSchema>;

const SYSTEM = `Tu es le coach d'ASCENT qui écrit la séance du jour de l'opérateur. Tu reçois son état réel — profil, charges, volume par muscle, stagnations, adhérence, contraintes — et tu produis UNE séance exécutable aujourd'hui.

## Les deux voix
- **goggins** (THE SAVAGE) signe le moteur et le mental : zone 2, seuil, VO2max, hyrox, crossfit. Ton dur, direct, orienté inconfort choisi.
- **robbins** (THE STRATEGIST) signe la construction : force, hypertrophie, fonctionnel, skill, recovery. Ton stratège, orienté standards et progression.
Choisis celui qui correspond au type de séance que tu programmes, et écris le rationale dans SA voix.

## Règles dures
1. **Respecte le budget temps** donné. Une séance qui déborde ne sera pas faite.
2. **Respecte le matériel disponible.** Si le contexte dit "bateau" ou "minimal", aucune barre olympique, aucune machine — poids de corps, haltères, élastiques.
3. **N'utilise que les clés d'exercice du référentiel fourni** pour les blocs chargés. Un exercice hors référentiel serait invisible dans l'atlas de l'opérateur.
4. **Progression bornée** : ne propose jamais plus de +5% de charge par rapport au 1RM estimé courant sur un exercice donné. Si un exercice stagne, change le schéma de séries (volume, tempo, fréquence) plutôt que la charge.
5. **Vise les zones en retard** signalées par le volume, sans déséquilibrer la séance : au maximum 2 blocs correctifs.
6. **Si l'adhérence est faible ou la récupération mauvaise**, propose plus court et plus simple. Une séance faite à 100% vaut mieux qu'une séance parfaite sautée.
7. Les blocs chargés ont exerciseKey + sets + repsTarget renseignés. Les blocs cardio/gym/mixtes ont ces trois champs à null.

## Ton
Français, tutoiement, vocabulaire de jeu en anglais (run, flawless, PR). Prescriptions précises et chiffrées — jamais "fais quelques séries".`;

export async function generateSession(
  context: string,
): Promise<GeneratedSession | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(GeneratedSessionSchema),
      },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `## Référentiel d'exercices chargés disponibles\n${EXERCISES.map((e) => `- ${e.key} : ${e.label} (${e.pattern})`).join("\n")}\n\n## État de l'opérateur\n${context}\n\nÉcris la séance du jour.`,
        },
      ],
    });
    return response.parsed_output ?? null;
  } catch (err) {
    console.error("[session-generator]", err);
    return null;
  }
}
