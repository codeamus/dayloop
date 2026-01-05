// src/domain/entities/Habit.ts

export type HabitId = string;

export type TimeOfDay = "morning" | "afternoon" | "evening";

export type DailySchedule = {
  type: "daily";
};

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
  | { type: "byDate"; endDate: string }; // "2025-01-10"

export type Habit = {
  id: HabitId;
  name: string;
  icon: string;
  color: string;

  schedule: HabitSchedule;

  // ✅ NUEVO: condición de término
  endCondition?: EndCondition;

  // 🧱 Bloque horario
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"

  // ⚠️ Legacy
  time?: string;

  timeOfDay: TimeOfDay;

  // 📅 Calendar
  calendarEventId?: string | null;

  // 🔔 Notificaciones
  reminderOffsetMinutes?: number | null;
  notificationIds?: string[];
};
