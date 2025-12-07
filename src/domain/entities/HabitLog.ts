// src/domain/entities/HabitLog.ts
import type { HabitId } from "./Habit";

export interface HabitLog {
  id: string;
  habitId: HabitId;
  date: string; // 'YYYY-MM-DD'
  done: boolean;
}
