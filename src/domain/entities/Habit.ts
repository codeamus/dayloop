// src/domain/entities/Habit.ts
export type HabitId = string;

export type HabitSchedule =
  | { type: "daily" }
  | { type: "weekly"; daysOfWeek: number[] }; // 0=Dom, 1=Lun, ... 6=Sáb

export interface Habit {
  id: HabitId;
  name: string;
  color: string;
  icon: string;
  schedule: HabitSchedule;
}
