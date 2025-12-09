// src/domain/entities/Habit.ts
export type HabitId = string;

export type TimeOfDay = "morning" | "afternoon" | "evening";

export type DailySchedule = {
  type: "daily";
  daysOfWeek: number[]; // 0-6
};

export type WeeklySchedule = {
  type: "weekly";
  daysOfWeek: number[]; // 0-6
};

export type HabitSchedule = DailySchedule | WeeklySchedule;

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

  timeOfDay?: TimeOfDay; // OPCIONAL
  time?: string; // OPCIONAL ("HH:mm")
}
