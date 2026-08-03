import type { CommsMessage } from "@/lib/engine/comms";
import type {
  AvatarState,
  BodyScan,
  PersonalRecord,
  Run,
  RunPerformance,
  SavingsEntry,
  ScanAngle,
  StatKey,
  WorkoutTemplate,
} from "@/lib/engine/types";
import type { DataSource } from "./source";
import * as actions from "./supabase-actions";

// Implémentation réelle : chaque méthode délègue à une Server Action
// (lib/data/supabase-actions.ts) qui seule détient le service_role Supabase.
// Peut être instanciée et appelée depuis un composant client ("use client")
// sans jamais exposer le secret — Next.js transforme les fonctions "use
// server" en appels RPC vers le serveur.
export class SupabaseDataSource implements DataSource {
  getAvatar(): Promise<AvatarState> {
    return actions.getAvatar();
  }
  listTemplates(): Promise<WorkoutTemplate[]> {
    return actions.listTemplates();
  }
  getTemplate(id: string): Promise<WorkoutTemplate | null> {
    return actions.getTemplate(id);
  }
  getTemplateBySlug(slug: string): Promise<WorkoutTemplate | null> {
    return actions.getTemplateBySlug(slug);
  }
  getWeeklyXp(weeks: number): Promise<Record<StatKey, number[]>> {
    return actions.getWeeklyXp(weeks);
  }
  listRecords(): Promise<PersonalRecord[]> {
    return actions.listRecords();
  }
  addRecord(
    movementKey: string,
    value: number,
    date: string,
  ): Promise<{ record: PersonalRecord; prevBest: number | null }> {
    return actions.addRecord(movementKey, value, date);
  }
  listSeaDays(): Promise<string[]> {
    return actions.listSeaDays();
  }
  toggleSeaDay(date: string): Promise<string[]> {
    return actions.toggleSeaDay(date);
  }
  getTrainingTime(date: string): Promise<string | null> {
    return actions.getTrainingTime(date);
  }
  setTrainingTime(date: string, time: string | null): Promise<void> {
    return actions.setTrainingTime(date, time);
  }
  getJournal(days: number): Promise<Record<string, string[]>> {
    return actions.getJournal(days);
  }
  toggleHabit(date: string, habitKey: string): Promise<string[]> {
    return actions.toggleHabit(date, habitKey);
  }
  listValidatedDays(): Promise<string[]> {
    return actions.listValidatedDays();
  }
  validateJournal(date: string): Promise<void> {
    return actions.validateJournal(date);
  }
  getSavings(): Promise<{ total: number; entries: SavingsEntry[] }> {
    return actions.getSavings();
  }
  addSaving(amount: number, date: string): Promise<SavingsEntry> {
    return actions.addSaving(amount, date);
  }
  listComms(): Promise<CommsMessage[]> {
    return actions.listComms();
  }
  sendComms(text: string, mood: number): Promise<CommsMessage[]> {
    return actions.sendComms(text, mood);
  }
  rollRun(templateId: string, riskTier: number): Promise<Run> {
    return actions.rollRun(templateId, riskTier);
  }
  rerollRun(runId: string): Promise<Run> {
    return actions.rerollRun(runId);
  }
  startRun(runId: string): Promise<Run> {
    return actions.startRun(runId);
  }
  completeRun(runId: string, performance: RunPerformance): Promise<Run> {
    return actions.completeRun(runId, performance);
  }
  abandonRun(runId: string): Promise<Run> {
    return actions.abandonRun(runId);
  }
  getRun(runId: string): Promise<Run | null> {
    return actions.getRun(runId);
  }
  getActiveRun(): Promise<Run | null> {
    return actions.getActiveRun();
  }
  resetProtocol(): Promise<void> {
    return actions.resetProtocol();
  }
  listBodyScans(): Promise<BodyScan[]> {
    return actions.listBodyScans();
  }
  addBodyScan(date: string, angle: ScanAngle, dataUrl: string): Promise<BodyScan> {
    return actions.addBodyScan(date, angle, dataUrl);
  }
  deleteBodyScan(id: number): Promise<void> {
    return actions.deleteBodyScan(id);
  }
}
