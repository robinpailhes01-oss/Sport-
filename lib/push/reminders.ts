import { supabaseAdmin } from "@/lib/data/supabase-client";
import { sendPushToAll } from "./push-actions";

// Logique des rappels — appelée par le cron (app/api/cron/reminders/route.ts).
// La "date" suit la même convention que le reste de l'app (UTC ISO-slice,
// comme training_times/sea_days) ; seule l'heure du jour utilisée pour
// décider QUAND tirer est calée sur Europe/Paris — un rappel "30 min avant"
// n'a de sens qu'en heure locale.

function todayIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function parisHm(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

async function alreadySent(date: string, kind: string): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from("notification_log")
    .select("date")
    .eq("date", date)
    .eq("kind", kind)
    .maybeSingle();
  return Boolean(data);
}

async function markSent(date: string, kind: string): Promise<void> {
  await supabaseAdmin().from("notification_log").insert({ date, kind });
}

async function dayCountsForStreak(date: string): Promise<boolean> {
  const admin = supabaseAdmin();
  const [{ data: runs }, { data: validated }, { data: sea }] = await Promise.all([
    admin
      .from("runs")
      .select("id")
      .eq("status", "completed")
      .gte("completed_at", `${date}T00:00:00.000Z`)
      .lt("completed_at", `${date}T23:59:59.999Z`),
    admin.from("journal_validated").select("date").eq("date", date).maybeSingle(),
    admin.from("sea_days").select("date").eq("date", date).maybeSingle(),
  ]);
  return Boolean((runs && runs.length > 0) || validated || sea);
}

export async function runReminders(): Promise<{ checked: string[]; sent: string[] }> {
  const date = todayIsoUtc();
  const nowMin = hmToMinutes(parisHm());
  const checked: string[] = [];
  const sent: string[] = [];

  // ── Rappel heure d'entraînement — fenêtre [-35, -20] min ──
  checked.push("training_reminder");
  const { data: tt } = await supabaseAdmin()
    .from("training_times")
    .select("time")
    .eq("date", date)
    .maybeSingle();
  if (tt?.time) {
    const delta = hmToMinutes(tt.time) - nowMin;
    if (delta >= 20 && delta <= 35 && !(await alreadySent(date, "training_reminder"))) {
      await sendPushToAll({
        title: "⏱ Séance dans 30 min",
        body: `Tu t'entraînes à ${tt.time} — prépare-toi.`,
        url: "/",
        tag: "training-reminder",
      });
      await markSent(date, "training_reminder");
      sent.push("training_reminder");
    }
  }

  // ── Streak en danger — fenêtre 20h00-20h15, si la journée ne compte pas encore ──
  checked.push("streak_risk");
  if (nowMin >= 20 * 60 && nowMin <= 20 * 60 + 15 && !(await alreadySent(date, "streak_risk"))) {
    if (!(await dayCountsForStreak(date))) {
      await sendPushToAll({
        title: "🔥 Streak en jeu",
        body: "Rien d'enregistré aujourd'hui — un run, ton journal ou une journée en mer suffit.",
        url: "/",
        tag: "streak-risk",
      });
      await markSent(date, "streak_risk");
      sent.push("streak_risk");
    }
  }

  return { checked, sent };
}
