import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Serveur UNIQUEMENT — service_role bypasse RLS. Ce module n'est jamais
// importé que par des fichiers "use server" (lib/data/supabase-actions.ts) ;
// la clé ne quitte donc jamais le bundle navigateur.

let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase non configuré : NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquantes.",
    );
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
