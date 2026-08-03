import { NextResponse } from "next/server";
import { callCommsAi } from "@/lib/ai/comms-client";
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

  const replies = await callCommsAi(body.text, body.mood, body.context);
  if (!replies) {
    return NextResponse.json(
      { error: "Réponse IA non exploitable" },
      { status: 502 },
    );
  }
  return NextResponse.json({ replies });
}
