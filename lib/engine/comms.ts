// COMMS — le carré où l'opérateur parle à ses trois agents.
// Chaque entrée est CONSIGNÉE (c'est la mémoire que les futurs agents IA
// liront). Les réponses actuelles sont rule-based : routage par thème/humeur
// vers la bonne persona, avec des rappels puisés dans l'historique.

export type CommsAuthor = "me" | "goggins" | "robbins" | "oracle";

export interface CommsMessage {
  id: number;
  author: CommsAuthor;
  text: string;
  /** État déclaré 1..5 — uniquement sur les messages de l'opérateur */
  mood?: number;
  createdAt: string;
}

export interface CommsContext {
  /** Nombre total d'entrées de l'opérateur (mémoire accumulée) */
  entryCount: number;
  /** Il y a combien de jours l'opérateur était au plus bas (mood ≤ 2), null si jamais */
  lastLowMoodDaysAgo: number | null;
  /** Stat la plus faible de la semaine (fournie par Oracle) */
  weakStatLabel: string;
}

interface Rule {
  author: Exclude<CommsAuthor, "me">;
  match: (text: string, mood: number) => boolean;
  replies: string[];
}

const RULES: Rule[] = [
  // ROBBINS — le sommeil, le stress, le travail, les standards
  {
    author: "robbins",
    match: (t) =>
      /sommeil|dormi|fatigue|stress|boulot|travail|bateau|client|journée chargée|épuis/.test(t),
    replies: [
      "Ce que tu décris, c'est de l'énergie mal récupérée, pas un manque de volonté. Ce soir : écrans off 22h30, et un vrai protocole récup. Ton standard, c'est ça.",
      "Les journées comme celle-là sont exactement pourquoi on a mis la récup dans le jeu. Hammam ou bain froid ce soir — tu changes ton état d'abord, tes pensées suivront.",
      "Note bien cette journée : c'est en la relisant dans un mois qu'on verra ton vrai progrès. Élève le standard d'un cran, pas de dix.",
    ],
  },
  // GOGGINS — l'inconfort, le doute, l'envie de lâcher (quand l'état tient encore)
  {
    author: "goggins",
    match: (t) =>
      /dur|difficile|pas envie|abandonn|lâch|mal partout|cass|démotiv|peur/.test(t),
    replies: [
      "Bien. C'est exactement là que les autres s'arrêtent. Toi tu viens de le consigner au lieu de le fuir — c'est déjà une rep. Demain tu te présentes quand même.",
      "Le confort t'aurait rien appris aujourd'hui. Note ce que tu ressens, garde-le, et ressors-le le jour où tu voudras négocier avec toi-même.",
      "Tu n'as pas besoin d'être motivé. Tu as besoin d'être là. La mission de demain n'a pas bougé.",
    ],
  },
  // ORACLE — les bilans, les chiffres, la trajectoire
  {
    author: "oracle",
    match: (t) => /bilan|chiffre|progr|où j'en suis|semaine|stat|analyse/.test(t),
    replies: [
      "Consigné et croisé avec ton ledger. Signal actuel : {weakStat} est ta stat la plus silencieuse cette semaine — c'est là que je regarderais.",
      "J'ai ce qu'il faut. Ouvre mon rapport pour le détail — et cette entrée affine ma lecture de tes patterns.",
    ],
  },
];

// Quand l'opérateur est au fond (état ≤ 2), la TEAM répond :
// Robbins remotive d'abord, Goggins ferme la marche.
const TEAM_LOW_MOOD: { robbins: string[]; goggins: string[] } = {
  robbins: [
    "Écoute-moi. Ce que tu ressens là n'est pas la réalité — c'est ton état du moment, et un état, ça se change : bouge, respire, douche froide, 10 minutes dehors. On ne prend aucune décision sur la vie un jour de batterie vide.",
    "Regarde d'où tu viens au lieu de regarder ce qui te manque. Tu as un protocole, une trajectoire, et une équipe. Les jours comme aujourd'hui sont le prix des jours dont tu seras fier — change ton état, le reste suivra.",
    "Un mauvais jour n'a jamais défini personne. Ta seule mission ce soir : dormir. Demain on repart avec des standards, pas des reproches.",
  ],
  goggins: [
    "Et quand tu as fini de l'écouter — souviens-toi : tu as déjà survécu à 100% de tes pires journées. Stay hard.",
    "Consigne la douleur. C'est du carburant pour demain. Rien de plus.",
    "Personne ne vient te sauver. Bonne nouvelle : t'as jamais eu besoin de ça.",
  ],
};

// Fallback par humeur quand aucun thème ne matche
const FALLBACKS: Record<"high" | "mid", { author: Exclude<CommsAuthor, "me">; replies: string[] }> = {
  high: {
    author: "goggins",
    replies: [
      "Bonne énergie. Ne la célèbre pas — investis-la. C'est le jour parfait pour monter d'un risk tier.",
      "Les bons jours sont faits pour construire l'avance que tu dépenseras les mauvais jours. Profite, mais charge la barre.",
    ],
  },
  mid: {
    author: "oracle",
    replies: [
      "Consigné. Les jours \"normaux\" sont les plus précieux pour tes patterns — c'est eux qui révèlent tes vraies tendances.",
      "Reçu. Chaque entrée m'apprend quelque chose que les chiffres seuls ne disent pas.",
    ],
  },
};

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Route l'entrée et compose la ou les réponses.
 * État ≤ 2 → la team répond à deux voix (Robbins remotive, Goggins ferme).
 */
export function agentReplies(
  text: string,
  mood: number,
  ctx: CommsContext,
  rng: () => number = Math.random,
): { author: Exclude<CommsAuthor, "me">; text: string }[] {
  const t = text.toLowerCase();

  if (mood <= 2) {
    return [
      { author: "robbins", text: pick(TEAM_LOW_MOOD.robbins, rng) },
      { author: "goggins", text: pick(TEAM_LOW_MOOD.goggins, rng) },
    ];
  }

  const rule = RULES.find((r) => r.match(t, mood));
  const base = rule ?? (mood >= 4 ? FALLBACKS.high : FALLBACKS.mid);

  let reply = pick(base.replies, rng).replace("{weakStat}", ctx.weakStatLabel);

  // Rappels de mémoire — c'est ça qui donnera le "il me connaît par cœur"
  if (
    mood >= 4 &&
    ctx.lastLowMoodDaysAgo !== null &&
    ctx.lastLowMoodDaysAgo <= 14
  ) {
    reply +=
      ctx.lastLowMoodDaysAgo === 0
        ? " Quelques heures plus tôt tu étais au fond. Relis ton entrée — et regarde-toi maintenant."
        : ` Il y a ${ctx.lastLowMoodDaysAgo} jour${ctx.lastLowMoodDaysAgo > 1 ? "s" : ""}, tu étais au fond. Relis ton entrée — et regarde-toi aujourd'hui.`;
  } else if (ctx.entryCount > 0 && ctx.entryCount % 10 === 9) {
    reply += ` (${ctx.entryCount + 1}ᵉ entrée du livre de bord — la mémoire se construit.)`;
  }

  return [{ author: base.author, text: reply }];
}
