"use server";

import webpush from "web-push";
import { supabaseAdmin } from "@/lib/data/supabase-client";

// Serveur uniquement — VAPID_PRIVATE_KEY ne quitte jamais cette frontière.
// notification_log gère la dédup côté cron (lib/push/reminders.ts) ; les
// fonctions ici sont génériques : elles ne savent pas POURQUOI on notifie.

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new Error("Clés VAPID manquantes — notifications indisponibles.");
  }
  webpush.setVapidDetails("mailto:ascent-app@localhost", publicKey, privateKey);
}

export async function subscribePush(sub: PushSubscriptionInput): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("push_subscriptions")
    .upsert(
      { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      { onConflict: "endpoint" },
    );
  if (error) throw new Error(error.message);
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await supabaseAdmin().from("push_subscriptions").delete().eq("endpoint", endpoint);
}

export async function isPushSubscribed(endpoint: string): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from("push_subscriptions")
    .select("endpoint")
    .eq("endpoint", endpoint)
    .maybeSingle();
  return Boolean(data);
}

/** Envoie à tous les appareils abonnés ; nettoie les abonnements morts (410/404). */
export async function sendPushToAll(
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  configureWebPush();
  const admin = supabaseAdmin();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");
  if (error) throw new Error(error.message);

  let sent = 0;
  let removed = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number } | undefined)?.statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          removed++;
        }
      }
    }),
  );
  return { sent, removed };
}

export async function sendTestPush(): Promise<{ sent: number }> {
  const { sent } = await sendPushToAll({
    title: "ASCENT — Test",
    body: "Si tu vois ça, les notifications marchent.",
    tag: "ascent-test",
  });
  return { sent };
}
