import { NextResponse } from "next/server";
import { runReminders } from "@/lib/push/reminders";

export const dynamic = "force-dynamic";

// Appelé par Vercel Cron (voir vercel.json). Protégé par CRON_SECRET si
// défini — Vercel l'envoie automatiquement en "Authorization: Bearer ...".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runReminders();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron/reminders]", err);
    return NextResponse.json({ error: "Échec du cron" }, { status: 500 });
  }
}
