import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  CommsReplySchema,
  buildCommsSystemPrompt,
  buildCommsUserPrompt,
} from "./comms-prompt";
import type { CommsAiContext, CommsAiReply } from "./comms-types";

// Serveur uniquement — seul endroit qui voit ANTHROPIC_API_KEY. Appelé
// directement par les Server Actions Supabase (pas de saut HTTP inutile,
// tout tourne déjà côté serveur) et par app/api/comms/route.ts (pour le
// chemin MockDataSource, qui lui tourne dans le navigateur et a besoin
// d'une vraie route HTTP).
export async function callCommsAi(
  text: string,
  mood: number,
  context: CommsAiContext,
): Promise<CommsAiReply[] | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

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
        { role: "user", content: buildCommsUserPrompt(text, mood, context) },
      ],
    });
    return response.parsed_output?.replies ?? null;
  } catch (err) {
    console.error("[comms-ai]", err);
    return null;
  }
}
