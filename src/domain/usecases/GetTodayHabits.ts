import type { Habit } from "@/domain/entities/Habit";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

function getYMDParts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

function getDayOfWeekFromDate(date: string): number {
  const { y, m, d } = getYMDParts(date);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.getDay(); // 0=Dom ... 6=Sáb
}

function getDayOfMonthFromDate(date: string): number {
  const { d } = getYMDParts(date);
  return d ?? 1; // 1..31
}

function daysInMonthFromDate(date: string): number {
  const { y, m } = getYMDParts(date);
  // new Date(y, m, 0) = último día del mes (m es 1..12)
  return new Date(y, m ?? 1, 0).getDate();
}

/**
 * Comparación segura con YYYY-MM-DD (lexicográfica sirve)
 * - date > endDate => ya expiró
 * - date <= endDate => sigue activo
 */
function isExpired(date: string, endDate: string): boolean {
  return date > endDate;
}

/**
 * Regla mensual elegida:
 * - Si hoy es 28/29/30 y el usuario eligió 31 (o 30 en febrero), lo tratamos como "último día del mes".
 * Ej: daysOfMonth incluye 31, mes=Feb => se cumple el día 28/29.
 */
function matchesMonthly(daysOfMonth: number[], date: string): boolean {
  const dom = getDayOfMonthFromDate(date); // 1..31
  const dim = daysInMonthFromDate(date); // 28..31

  const set = new Set(
    (Array.isArray(daysOfMonth) ? daysOfMonth : [])
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n))
      .map((n) => Math.max(1, Math.min(31, n)))
  );

  if (set.has(dom)) return true;

  // si hoy es el último día del mes y hay "días" mayores al dim => lo activamos
  if (dom === dim) {
    for (const d of set) {
      if (d > dim) return true; // 31 en un mes de 30, etc.
    }
  }

  return false;
}

export class GetTodayHabits {
  constructor(
    private habitRepository: HabitRepository,
    private habitLogRepository: HabitLogRepository
  ) {}

  async execute(date: string): Promise<{ habit: Habit; done: boolean }[]> {
    const [habits, logs] = await Promise.all([
      this.habitRepository.getAll(),
      this.habitLogRepository.getLogsForDate(date),
    ]);

    const doneById = new Map(
      logs.filter((l) => l.done).map((l) => [l.habitId, true] as const)
    );

    const dayOfWeek = getDayOfWeekFromDate(date);
    const dayOfMonth = getDayOfMonthFromDate(date);

    const todayHabits = habits.filter((h) => {
      const schedule = h.schedule;

      // 1) EndCondition (si expiró, no mostrar)
      const end = h.endCondition;
      if (end?.type === "byDate" && typeof end.endDate === "string") {
        if (isExpired(date, end.endDate)) return false;
      }

      // 2) Schedule
      if (!schedule || !("type" in schedule)) return true;

      if (schedule.type === "daily") return true;

      if (schedule.type === "weekly") {
        const days = Array.isArray(schedule.daysOfWeek)
          ? schedule.daysOfWeek
          : [];
        return days.includes(dayOfWeek);
      }

      if (schedule.type === "monthly") {
        const days = Array.isArray(schedule.daysOfMonth)
          ? schedule.daysOfMonth
          : [];
        // (dayOfMonth no se usa directo porque aplicamos regla "último día")
        return matchesMonthly(days, date);
      }

      return true;
    });

    return todayHabits.map((habit) => ({
      habit,
      done: doneById.get(habit.id) ?? false,
    }));
  }
}
