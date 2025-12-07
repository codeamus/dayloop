// src/domain/usecases/GetTodayHabits.ts
import type { Habit } from "@/domain/entities/Habit";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

function getDayOfWeekFromDate(date: string): number {
  // Evitamos problemas de timezone construyendo YYYY, MM, DD manualmente
  const [yearStr, monthStr, dayStr] = date.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // 0-based
  const day = Number(dayStr);

  const d = new Date(year, month, day);
  return d.getDay(); // 0=Dom ... 6=Sáb
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

    const todayHabits = habits.filter((h) => {
      const schedule = h.schedule;

      // Seguridad por si hay basura
      if (!schedule || !("type" in schedule)) return true;

      if (schedule.type === "daily") return true;

      if (schedule.type === "weekly") {
        // Por si schedule_days viene roto o vacío
        const days = Array.isArray(schedule.daysOfWeek)
          ? schedule.daysOfWeek
          : [];
        return days.includes(dayOfWeek);
      }

      // fallback por si aparece algo raro
      return true;
    });

    return todayHabits.map((habit) => ({
      habit,
      done: doneById.get(habit.id) ?? false,
    }));
  }
}
