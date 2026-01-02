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

export type HabitSchedule = DailySchedule | WeeklySchedule;


export type EndCondition =
  | { type: "none" }
  | { type: "byDate"; endDate: string }; // "2025-01-10"

export type Habit = {
  id: HabitId;
  name: string;
  icon: string;
  color: string;

  schedule: HabitSchedule;

  // 🧱 Bloque horario (para calendario y UI)
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"

  // ⚠️ Legacy (se eliminará más adelante)
  // Lo seguimos devolviendo igual a startTime
  time?: string;

  timeOfDay: TimeOfDay;

  // 📅 Apple Calendar / Google Calendar
  calendarEventId?: string | null;

  // 🔔 Notificaciones
  reminderOffsetMinutes?: number | null;
};
