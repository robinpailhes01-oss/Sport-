import type { CommsMessage } from "@/lib/engine/comms";
import type {
  AvatarState,
  BodyScan,
  OperatorProfile,
  PersonalRecord,
  Run,
  RunPerformance,
  SavingsEntry,
  ScanAngle,
  SetLog,
  StatKey,
  WeighIn,
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

  /** Tous les essais, tous mouvements confondus */
  listRecords(): Promise<PersonalRecord[]>;
  /** Enregistre un essai ; s'il bat le meilleur précédent → isPr + XP */
  addRecord(
    movementKey: string,
    value: number,
    date: string,
  ): Promise<{ record: PersonalRecord; prevBest: number | null }>;

  /** Jours de mer déclarés (ISO yyyy-mm-dd) — décalent la mission, pas le streak */
  listSeaDays(): Promise<string[]>;
  toggleSeaDay(date: string): Promise<string[]>;

  /** Heure d'entraînement déclarée pour un jour ("HH:MM"), null si non fixée */
  getTrainingTime(date: string): Promise<string | null>;
  setTrainingTime(date: string, time: string | null): Promise<void>;

  /** Habitudes cochées par date (ISO yyyy-mm-dd → clés d'habitudes) */
  getJournal(days: number): Promise<Record<string, string[]>>;
  toggleHabit(date: string, habitKey: string): Promise<string[]>;
  /** Jours dont le journal a été explicitement validé */
  listValidatedDays(): Promise<string[]>;
  validateJournal(date: string): Promise<void>;

  getSavings(): Promise<{ total: number; entries: SavingsEntry[] }>;
  addSaving(amount: number, date: string): Promise<SavingsEntry>;

  /** Fil COMMS — l'opérateur parle, un agent répond, tout est consigné */
  listComms(): Promise<CommsMessage[]>;
  sendComms(text: string, mood: number): Promise<CommsMessage[]>;

  /** Crée un run et tire ses modifiers pour le risk tier donné */
  rollRun(templateId: string, riskTier: number): Promise<Run>;
  /** Re-tire les modifiers d'un run encore à l'état "rolled" */
  rerollRun(runId: string): Promise<Run>;
  startRun(runId: string): Promise<Run>;
  completeRun(runId: string, performance: RunPerformance): Promise<Run>;
  abandonRun(runId: string): Promise<Run>;

  getRun(runId: string): Promise<Run | null>;
  getActiveRun(): Promise<Run | null>;

  /** Efface tout : XP, records, journal, épargne, comms. Repart à zéro, irréversible. */
  resetProtocol(): Promise<void>;

  /** Profil opérateur — racine de la personnalisation (ratios, agents, atlas) */
  getProfile(): Promise<OperatorProfile>;
  setProfile(profile: Partial<OperatorProfile>): Promise<OperatorProfile>;

  /** Pesées, de la plus récente à la plus ancienne */
  listWeighIns(): Promise<WeighIn[]>;
  /** Une pesée par date — ré-enregistrer le même jour écrase */
  addWeighIn(date: string, weightKg: number): Promise<void>;

  /** Séries réellement effectuées — alimente e1RM, tonnage et agents */
  listSetLogs(days?: number): Promise<SetLog[]>;
  /** Remplace les séries d'un exercice pour un run donné (saisie idempotente) */
  saveSetLogs(
    runId: string,
    exerciseKey: string,
    date: string,
    sets: { weightKg: number; reps: number; rpe?: number | null }[],
  ): Promise<void>;

  /** Tous les scans, du plus récent au plus ancien — url signée/temporaire, jamais publique */
  listBodyScans(): Promise<BodyScan[]>;
  /** dataUrl = "data:image/jpeg;base64,...", capturé côté client */
  addBodyScan(date: string, angle: ScanAngle, dataUrl: string): Promise<BodyScan>;
  deleteBodyScan(id: number): Promise<void>;
}
