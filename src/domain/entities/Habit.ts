export type HabitId = string;

export type TimeOfDay = "morning" | "afternoon" | "evening";

export type DailySchedule = {
  type: "daily";
};

export type WeeklySchedule = {
  type: "weekly";
  daysOfWeek: number[]; // 0-6 (Dom..Sáb)
};

export type MonthlySchedule = {
  type: "monthly";
  daysOfMonth: number[]; // 1-31
};

export type HabitSchedule = DailySchedule | WeeklySchedule | MonthlySchedule;

export type EndCondition =
  | { type: "none" }
  | { type: "byDate"; endDate: string }; // "YYYY-MM-DD"

export type Habit = {
  id: HabitId;
  name: string;
  icon: string;
  color: string;

  schedule: HabitSchedule;

  // 🧱 Bloque horario
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"

  // ⚠️ Legacy (se eliminará más adelante)
  time?: string;

  timeOfDay: TimeOfDay;

  // ✅ NUEVO: condición de término
  endCondition: EndCondition;

  // 📅 Apple Calendar / Google Calendar
  calendarEventId?: string | null;

  // 🔔 Notificaciones
  reminderOffsetMinutes?: number | null;
};
