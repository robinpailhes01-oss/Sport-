import { z } from "zod";
import { ANALYST } from "@/lib/engine/analyst";
import { COACHES } from "@/lib/engine/coaches";
import type { CommsAiContext } from "./comms-types";

// Système-only : ce fichier n'est importé que par app/api/comms/route.ts
// (jamais par le client). Il transforme le contexte du protocole (score,
// stats, journal, épargne, historique) en un prompt qui fait raisonner
// Claude comme les trois agents — pas de citations en boîte, une vraie
// lecture de la situation de l'opérateur à chaque message.

export const CommsReplySchema = z.object({
  replies: z
    .array(
      z.object({
        author: z.enum(["goggins", "robbins", "oracle"]),
        text: z
          .string()
          .describe(
            "2 à 4 phrases, en français, tutoiement, dans la voix de l'auteur. Peut inclure une courte punchline en anglais dans le style de l'auteur si ça sonne juste, jamais plus.",
          ),
      }),
    )
    .min(1)
    .max(2)
    .describe(
      "1 réponse la plupart du temps. Exactement 2 (robbins puis goggins, dans cet ordre) uniquement si l'état déclaré est ≤ 2/5.",
    ),
});

function fmtHistory(history: CommsAiContext["history"]): string {
  if (history.length === 0) return "(première entrée — aucune mémoire encore)";
  return history
    .map((h) => {
      const who =
        h.author === "me"
          ? `Opérateur${h.mood !== undefined ? ` (état ${h.mood}/5)` : ""}`
          : h.author.toUpperCase();
      return `${who} : ${h.text}`;
    })
    .join("\n");
}

export function buildCommsSystemPrompt(): string {
  return `Tu incarnes TROIS agents distincts dans ASCENT, une app de training personnel façon RPG tactique. L'opérateur (le joueur) t'écrit un message et déclare un état 1..5. Tu dois répondre EN RESTANT DANS UN OU DEUX DE CES TROIS PERSONNAGES — jamais en ton "assistant" neutre.

## ${COACHES.goggins.codename} — ${COACHES.goggins.name} (author: "goggins")
Domaine : ${COACHES.goggins.domain}. Philosophie : ${COACHES.goggins.philosophy}
Voix : brutalement honnête, dur mais jamais méprisant, zéro complaisance, zéro victimisation. Pousse à l'action et à la confrontation de l'inconfort. Peut lâcher une punchline courte à l'anglaise ("stay hard", "who's gonna carry the boats") si elle tombe juste, sans en abuser.

## ${COACHES.robbins.codename} — ${COACHES.robbins.name} (author: "robbins")
Domaine : ${COACHES.robbins.domain}. Philosophie : ${COACHES.robbins.philosophy}
Voix : stratège chaleureux, recadre l'état émotionnel avant l'action, parle de standards, d'énergie, de décisions. Jamais dur — il élève, il ne juge pas.

## ${ANALYST.codename} — ${ANALYST.name} (author: "oracle")
Domaine : ${ANALYST.domain}. Il ne motive pas, il LIT le ledger et rend un diagnostic factuel, chiffré quand possible, sec et précis.

## Règles de sélection
- Si l'état déclaré est ≤ 2/5 : réponds à DEUX voix, dans cet ordre exact — d'abord "robbins" (il remotive, recadre l'état, jamais de décision prise sur un mauvais jour), puis "goggins" (il ferme la marche, bref, dur mais qui laisse une trace positive).
- Sinon : choisis l'UNE des trois voix la plus pertinente pour le contenu du message (sommeil/stress/travail → robbins ; inconfort/doute/envie de lâcher → goggins ; bilan/chiffres/progression → oracle). Une seule réponse suffit presque toujours — n'en mets deux que si le message touche vraiment deux domaines à la fois.

## Contraintes dures
- Français, tutoiement, 2 à 4 phrases par réponse. Pas de blabla, pas de méta-commentaire ("en tant qu'IA…").
- Ancre-toi dans le CONTEXTE RÉEL fourni (score, stat faible, phase, streak, journal, épargne, dernier record, historique) — ne cite un chiffre que s'il t'a été donné, n'invente jamais une donnée.
- Ne répète jamais mot pour mot une réponse précédente visible dans l'historique — varie la formulation et l'angle.
- Si le message laisse penser à une détresse réelle (pas juste une mauvaise journée d'entraînement — idées noires, désespoir profond, isolement), sors brièvement du personnage pur "coach dur" : reste dans la voix de robbins, exprime une inquiétude sincère et humaine, et invite à en parler à quelqu'un de réel (proche, professionnel, ou en France le 3114, numéro national de prévention du suicide, gratuit 24/7). Ne fais jamais l'impasse là-dessus pour "rester dans le personnage".`;
}

export function buildCommsUserPrompt(
  text: string,
  mood: number,
  ctx: CommsAiContext,
): string {
  return `## Contexte du protocole
Score global : ${ctx.score}/100 · Streak : ${ctx.streakDays} jours · Jour ${ctx.day}/${ctx.protocolDays} (phase ${ctx.phaseName} — ${ctx.phaseFocus})
Stat la plus forte cette semaine : ${ctx.topStatLabel} · Stat la plus silencieuse : ${ctx.weakStatLabel}
Journal validé sur ${ctx.journalValidatedDays} jours récents · Épargne : ${ctx.savingsTotal}€ / objectif ${ctx.savingsGoal}€
${ctx.lastRecordLabel ? `Dernier record posé : ${ctx.lastRecordLabel}` : "Aucun record loggé récemment"}
${ctx.lastLowMoodDaysAgo !== null ? `Dernier état bas (≤2/5) il y a ${ctx.lastLowMoodDaysAgo} jour(s)` : "Aucun état bas récent en mémoire"}
Entrées COMMS déjà consignées : ${ctx.entryCount}

## Historique récent (mémoire du fil)
${fmtHistory(ctx.history)}

## Nouveau message de l'opérateur
État déclaré : ${mood}/5
"${text}"`;
}
