import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import {
  CommsReplySchema,
  buildCommsSystemPrompt,
  buildCommsUserPrompt,
} from "@/lib/ai/comms-prompt";
import type { CommsAiRequest } from "@/lib/ai/comms-types";

// Route serveur — seul endroit du projet qui voit ANTHROPIC_API_KEY.
// Le client (MockDataSource, dans le navigateur) ne parle qu'à cette route
// et retombe sur le moteur de règles local si elle échoue ou si aucune clé
// n'est configurée : l'app ne casse jamais faute d'IA branchée.

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY absente — fallback local attendu" },
      { status: 503 },
    );
  }

  let body: CommsAiRequest;
  try {
    body = (await req.json()) as CommsAiRequest;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  if (!body?.text?.trim() || !body?.context) {
    return NextResponse.json({ error: "Requête incomplète" }, { status: 400 });
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: zodOutputFormat(CommsReplySchema),
      },
      system: buildCommsSystemPrompt(),
      messages: [
        {
          role: "user",
          content: buildCommsUserPrompt(body.text, body.mood, body.context),
        },
      ],
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "Réponse IA non exploitable" },
        { status: 502 },
      );
    }

    return NextResponse.json(response.parsed_output);
  } catch (err) {
    console.error("[/api/comms]", err);
    return NextResponse.json({ error: "Échec de l'appel IA" }, { status: 502 });
  }
}
