import type { CommsAuthor } from "@/lib/engine/comms";

// Contrat entre le client (MockDataSource, navigateur) et la route serveur
// /api/comms — zéro dépendance SDK ici, uniquement des types, pour que ce
// fichier reste importable côté client sans alourdir le bundle.

export interface CommsAiContext {
  score: number;
  streakDays: number;
  day: number;
  protocolDays: number;
  phaseName: string;
  phaseFocus: string;
  entryCount: number;
  lastLowMoodDaysAgo: number | null;
  topStatLabel: string;
  weakStatLabel: string;
  journalValidatedDays: number;
  savingsTotal: number;
  savingsGoal: number;
  lastRecordLabel: string | null;
  /** 6 derniers échanges, du plus ancien au plus récent */
  history: { author: CommsAuthor; text: string; mood?: number }[];
}

export interface CommsAiRequest {
  text: string;
  mood: number;
  context: CommsAiContext;
}

export interface CommsAiReply {
  author: Exclude<CommsAuthor, "me">;
  text: string;
}

export interface CommsAiResponse {
  replies: CommsAiReply[];
}
