// src/domain/entities/HabitLog.ts
import type { HabitId } from "./Habit";

export interface HabitLog {
  id: string;
  habitId: HabitId;
  date: string; // 'YYYY-MM-DD'
  done: boolean;
  /**
   * Progreso del día: cuántas veces se ha completado el hábito.
   * Default: 1 (comportamiento tradicional).
   * El hábito se considera "completado" (done=true) cuando progress >= targetRepeats.
   */
  progress?: number;
}

export type HabitStreak = {
  habitId: string;
  currentDailyStreak: number;
  bestDailyStreak: number;
  currentWeeklyStreak: number;
  bestWeeklyStreak: number;
};
