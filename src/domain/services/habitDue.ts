import type { Habit, HabitSchedule } from "@/domain/entities/Habit";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysInMonth(d: Date) {
  // día 0 del mes siguiente = último día del mes actual
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function isEndedByDate(habit: Habit, date: Date) {
  const end = habit.endCondition ?? { type: "none" as const };
  if (end.type !== "byDate") return false;

  const today = startOfDay(date);
  const e = new Date(end.endDate);
  const endDay = startOfDay(e);

  // si hoy es DESPUÉS del endDate => terminó
  return today > endDay;
}

function isDueBySchedule(schedule: HabitSchedule, date: Date) {
  if (schedule.type === "daily") return true;

  if (schedule.type === "weekly") {
    const dow = date.getDay(); // 0-6
    return schedule.daysOfWeek.includes(dow);
  }

  // monthly
  const dom = date.getDate(); // 1-31
  const dim = daysInMonth(date);

  // Normalizamos: si el usuario eligió 31 y el mes tiene 30,
  // ese "31" se interpreta como "último día del mes" (30).
  const normalizedDays = schedule.daysOfMonth.map((d) =>
    Math.min(Math.max(1, d), 31)
  );

  const wantsLastDay = normalizedDays.some((d) => d > dim); // ej 31 en febrero
  const lastDay = dim;

  // Si hoy es el último día y el usuario eligió un día que no existe en este mes → due
  if (dom === lastDay && wantsLastDay) return true;

  // Due normal
  return normalizedDays.includes(dom);
}

export function isHabitDueToday(habit: Habit, date = new Date()) {
  if (isEndedByDate(habit, date)) return false;
  return isDueBySchedule(habit.schedule, date);
}
