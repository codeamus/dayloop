// src/domain/usecases/GetTodayHabits.ts
import type { Habit } from "@/domain/entities/Habit";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

function getLocalDateParts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m: m - 1, d };
}

function getDayOfWeekFromDate(date: string): number {
  const { y, m, d } = getLocalDateParts(date);
  return new Date(y, m, d).getDay(); // 0..6
}

function getDayOfMonthFromDate(date: string): number {
  const { d } = getLocalDateParts(date);
  return d; // 1..31
}

function getLastDayOfMonth(date: string): number {
  const { y, m } = getLocalDateParts(date);
  // día 0 del mes siguiente => último día del mes actual
  return new Date(y, m + 1, 0).getDate();
}

function isExpiredByEndCondition(h: Habit, date: string) {
  const ec = h.endCondition ?? { type: "none" as const };
  if (ec.type !== "byDate") return false;
  // date y endDate están en YYYY-MM-DD => compare lexicográfico sirve
  return date > ec.endDate;
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
    const lastDay = getLastDayOfMonth(date);

    const todayHabits = habits.filter((h) => {
      // ✅ si expira, no se muestra
      if (isExpiredByEndCondition(h, date)) return false;

      const schedule = h.schedule;

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
        if (days.length === 0) return false;

        // ✅ regla: si el mes no tiene ese día (ej 31), lo asignamos al último día del mes
        const effectiveDay = Math.min(dayOfMonth, lastDay);
        return days.includes(effectiveDay);
      }

      return true;
    });

    return todayHabits.map((habit) => ({
      habit,
      done: doneById.get(habit.id) ?? false,
    }));
  }
}
