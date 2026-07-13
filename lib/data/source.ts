import type {
  AvatarState,
  Run,
  RunPerformance,
  StatKey,
  WorkoutTemplate,
} from "@/lib/engine/types";

// Contrat unique entre l'UI et la persistance.
// L'UI ne parle QU'À cette interface — brancher Supabase plus tard
// = écrire une SupabaseDataSource, zéro retouche des écrans.
export interface DataSource {
  getAvatar(): Promise<AvatarState>;
  listTemplates(): Promise<WorkoutTemplate[]>;
  getTemplate(id: string): Promise<WorkoutTemplate | null>;
  getTemplateBySlug(slug: string): Promise<WorkoutTemplate | null>;

  /** XP par stat agrégée par semaine — index 0 = la plus ancienne */
  getWeeklyXp(weeks: number): Promise<Record<StatKey, number[]>>;

  /** Crée un run et tire ses modifiers pour le risk tier donné */
  rollRun(templateId: string, riskTier: number): Promise<Run>;
  /** Re-tire les modifiers d'un run encore à l'état "rolled" */
  rerollRun(runId: string): Promise<Run>;
  startRun(runId: string): Promise<Run>;
  completeRun(runId: string, performance: RunPerformance): Promise<Run>;
  abandonRun(runId: string): Promise<Run>;

  getRun(runId: string): Promise<Run | null>;
  getActiveRun(): Promise<Run | null>;
}
