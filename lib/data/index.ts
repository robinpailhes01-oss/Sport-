import { MockDataSource } from "./mock";
import type { DataSource } from "./source";

// Point d'entrée unique de la data pour toute l'UI.
// Brancher Supabase = remplacer l'implémentation ici, rien d'autre.
let instance: DataSource | null = null;

export function db(): DataSource {
  if (!instance) instance = new MockDataSource();
  return instance;
}

export type { DataSource } from "./source";
