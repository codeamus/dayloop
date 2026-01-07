// src/domain/entities/Habit.ts
export type HabitId = string;

export type TimeOfDay = "morning" | "afternoon" | "evening";

export type DailySchedule = { type: "daily" };

export type WeeklySchedule = {
  type: "weekly";
  daysOfWeek: number[]; // 0-6
};

export type MonthlySchedule = {
  type: "monthly";
  daysOfMonth: number[]; // 1-31
};

export type HabitSchedule = DailySchedule | WeeklySchedule | MonthlySchedule;

export type EndCondition =
  | { type: "none" }
  | { type: "byDate"; endDate: string }; // "YYYY-MM-DD"

export type PauseReason = "manual" | "ended";

export type Habit = {
  id: HabitId;
  name: string;
  icon: string;
  color: string;

  schedule: HabitSchedule;

  endCondition?: EndCondition;

  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"

  time?: string; // legacy
  timeOfDay: TimeOfDay;

  calendarEventId?: string | null;

  reminderOffsetMinutes?: number | null;
  notificationIds?: string[];

  isPaused?: boolean;
  pausedAt?: string | null; // "YYYY-MM-DD"
  pauseReason?: PauseReason | null;
};
