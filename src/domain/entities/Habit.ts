// src/domain/entities/Habit.ts
export type HabitId = string;

export type HabitSchedule =
  | { type: "daily" }
  | { type: "weekly"; daysOfWeek: number[] };

export interface Habit {
  id: HabitId;
  name: string;
  color: string;
  icon: string;
  schedule: HabitSchedule;
  timeOfDay: "morning" | "afternoon" | "evening";
  time: string; // "HH:mm"
}
