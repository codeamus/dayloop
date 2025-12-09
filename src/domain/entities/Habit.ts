// src/domain/entities/Habit.ts
export type HabitId = string;

export type HabitSchedule =
  | { type: "daily" }
  | { type: "weekly"; daysOfWeek: number[] };

export type EndCondition =
  | { type: "none" }
  | { type: "byDate"; endDate: string }; // "2025-01-10"

export interface Habit {
  id: HabitId;
  name: string;
  color: string;
  icon: string;
  schedule: HabitSchedule;
  endCondition: EndCondition;
  timeOfDay: "morning" | "afternoon" | "evening";
  time: string; // "HH:mm"
}
