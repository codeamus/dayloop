// src/domain/repositories/HabitLogRepository.ts
import type { HabitId } from "@/domain/entities/Habit";
import type { HabitLog } from "@/domain/entities/HabitLog";

export interface HabitLogRepository {
  getLogsForDate(date: string): Promise<HabitLog[]>;
  getLogsForHabit(habitId: HabitId): Promise<HabitLog[]>;
  toggle(habitId: HabitId, date: string): Promise<void>;
}
