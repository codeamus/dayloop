// src/domain/repositories/HabitLogRepository.ts
import type { HabitId } from "@/domain/entities/Habit";
import type { HabitLog } from "@/domain/entities/HabitLog";

export interface HabitLogRepository {
  getLogsForDate(date: string): Promise<HabitLog[]>;
  getLogsForHabit(habitId: HabitId): Promise<HabitLog[]>;
  toggle(habitId: HabitId, date: string): Promise<void>;
  getLogsForHabitSince(habitId: HabitId, fromDate: string): Promise<HabitLog[]>;
  upsertLog(
    habitId: HabitId,
    date: string,
    done: boolean,
    progress?: number
  ): Promise<void>;
  /**
   * Incrementa el progreso de un hábito para una fecha.
   * Si no existe el log, lo crea con progress=1.
   * Si existe, incrementa progress en 1.
   * Actualiza done basado en progress >= targetRepeats.
   */
  incrementProgress(
    habitId: HabitId,
    date: string,
    targetRepeats: number
  ): Promise<void>;
  /**
   * Obtiene la fecha del primer registro (MIN(date)) en habit_logs.
   * Retorna null si no hay registros.
   */
  getEarliestLogDate(): Promise<string | null>;
}
