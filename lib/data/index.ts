import { MockDataSource } from "./mock";
import { SupabaseDataSource } from "./supabase";
import type { DataSource } from "./source";

// Point d'entrée unique de la data pour toute l'UI.
// NEXT_PUBLIC_SUPABASE_URL est lisible aussi bien serveur que navigateur
// (préfixe NEXT_PUBLIC_) — c'est ce qui pilote le choix ici. Les méthodes de
// SupabaseDataSource, elles, délèguent à des Server Actions : le secret
// service_role ne quitte jamais le serveur même si db() est appelé depuis un
// composant client.
let instance: DataSource | null = null;

export function db(): DataSource {
  if (!instance) {
    instance = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new SupabaseDataSource()
      : new MockDataSource();
  }
  return instance;
}

export type { DataSource } from "./source";
