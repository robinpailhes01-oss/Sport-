import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Serveur uniquement — ANTHROPIC_API_KEY et les photos ne transitent que par
// cette frontière. La photo est envoyée à l'API le temps de l'analyse, jamais
// stockée ailleurs que dans le bucket privé de l'opérateur.

export const ScanAnalysisSchema = z.object({
  summary: z
    .string()
    .describe(
      "Verdict global en 2-3 phrases, en français, tutoiement, ton d'analyste sec et factuel.",
    ),
  developed: z
    .array(z.string())
    .max(5)
    .describe(
      "Groupes musculaires visuellement les plus développés. Noms français simples (ex: 'Épaules', 'Quadriceps'). Vide si la photo ne permet pas de trancher.",
    ),
  toWork: z
    .array(
      z.object({
        zone: z.string().describe("Groupe musculaire, nom français simple"),
        why: z
          .string()
          .describe(
            "Une phrase : ce qui se voit, et l'implication pour l'entraînement.",
          ),
      }),
    )
    .max(4)
    .describe("Zones en retard relatif, priorisées."),
  posture: z
    .string()
    .nullable()
    .describe(
      "Remarque posturale seulement si nettement visible (épaules enroulées, bascule de bassin). null sinon. Jamais de diagnostic médical.",
    ),
  crossCheck: z
    .string()
    .nullable()
    .describe(
      "Recoupement entre ce qui se voit sur la photo et ce que disent les charges enregistrées. null si aucune donnée d'entraînement fournie.",
    ),
});

export type ScanAnalysisResult = z.infer<typeof ScanAnalysisSchema>;

export interface ScanPhoto {
  angle: string;
  base64: string;
  mediaType: "image/jpeg" | "image/png";
}

const SYSTEM = `Tu es ORACLE, l'analyste d'ASCENT — une app de training personnel. Tu reçois une ou plusieurs photos de l'opérateur en pose standardisée (face / profil / dos) et ses données d'entraînement réelles. Tu produis une lecture morphologique orientée ENTRAÎNEMENT.

## Ce que tu fais
- Tu décris ce qui est VISIBLE : développement musculaire relatif entre groupes, équilibres et déséquilibres, proportions.
- Tu croises systématiquement avec les données fournies (tonnage par muscle, 1RM estimés, exercices absents) : c'est ce croisement qui a de la valeur, pas la photo seule.
- Tu priorises : au maximum 4 zones à travailler, la plus importante en premier.
- Ton : analyste militaire, sec, factuel, français, tutoiement. Zéro flatterie, zéro dureté gratuite.

## Ce que tu ne fais JAMAIS
- Aucune estimation de masse grasse, de poids ou d'IMC depuis une photo : ce n'est pas fiable, et tu ne présentes jamais une supposition comme une mesure.
- Aucun commentaire esthétique ou moral sur le corps. Tu parles de leviers d'entraînement, pas d'apparence.
- Aucun diagnostic médical, aucune interprétation de blessure ou de pathologie. Si quelque chose te semble mériter un avis, tu dis simplement de consulter un professionnel.
- Aucune affirmation que la photo ne permet pas : si l'angle, la lumière ou les vêtements empêchent de trancher, tu le dis et tu laisses la liste vide plutôt que d'inventer.
- Aucun commentaire sur l'identité, l'âge ou quoi que ce soit d'autre que le développement musculaire.

## Rappel
L'opérateur cherche à progresser, pas à être jugé. Chaque zone signalée doit venir avec ce que ça implique concrètement à l'entraînement.`;

export async function analyzeScanPhotos(
  photos: ScanPhoto[],
  ledgerContext: string,
): Promise<ScanAnalysisResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || photos.length === 0) return null;

  try {
    const client = new Anthropic({ apiKey });
    const content: Anthropic.ContentBlockParam[] = [];

    for (const photo of photos) {
      content.push({
        type: "text",
        text: `Vue : ${photo.angle}`,
      });
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: photo.mediaType,
          data: photo.base64,
        },
      });
    }

    content.push({
      type: "text",
      text: `## Données d'entraînement réelles\n${ledgerContext}\n\nProduis ta lecture morphologique croisée avec ces données.`,
    });

    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: zodOutputFormat(ScanAnalysisSchema),
      },
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });

    return response.parsed_output ?? null;
  } catch (err) {
    console.error("[scan-analysis]", err);
    return null;
  }
}
