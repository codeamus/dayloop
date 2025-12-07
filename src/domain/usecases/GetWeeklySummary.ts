// src/domain/usecases/GetWeeklySummary.ts
import type { Habit } from "@/domain/entities/Habit";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

type DaySummary = {
  date: string; // 'YYYY-MM-DD'
  label: string; // 'Lun', 'Mar', ...
  totalPlanned: number; // hábitos que aplican ese día
  totalDone: number; // hábitos marcados como done
  completionRate: number; // 0..1
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isHabitScheduledForDate(habit: Habit, d: Date): boolean {
  const dayOfWeek = d.getDay(); // 0-6
  const schedule = habit.schedule;

  if (!schedule || !("type" in schedule)) return true;

  if (schedule.type === "daily") return true;

  if (schedule.type === "weekly") {
    const days = Array.isArray(schedule.daysOfWeek) ? schedule.daysOfWeek : [];
    return days.includes(dayOfWeek);
  }

  return true;
}

export class GetWeeklySummary {
  constructor(
    private habitRepository: HabitRepository,
    private habitLogRepository: HabitLogRepository
  ) {}

  async execute(referenceDate: string): Promise<DaySummary[]> {
    const [y, m, d] = referenceDate.split("-").map(Number);
    const ref = new Date(y, m - 1, d);

    const habits = await this.habitRepository.getAll();

    const results: DaySummary[] = [];

    // últimos 7 días, incluyendo hoy
    for (let i = 6; i >= 0; i--) {
      const day = new Date(ref);
      day.setDate(ref.getDate() - i);

      const dateStr = formatDateYMD(day);
      const logs = await this.habitLogRepository.getLogsForDate(dateStr);

      const applicableHabits = habits.filter((h) =>
        isHabitScheduledForDate(h, day)
      );

      const doneByHabitId = new Set(
        logs.filter((l) => l.done).map((l) => l.habitId)
      );

      const totalPlanned = applicableHabits.length;
      const totalDone = applicableHabits.filter((h) =>
        doneByHabitId.has(h.id)
      ).length;

      const completionRate = totalPlanned === 0 ? 0 : totalDone / totalPlanned;

      results.push({
        date: dateStr,
        label: DAY_LABELS[day.getDay()],
        totalPlanned,
        totalDone,
        completionRate,
      });
    }

    return results;
  }
}
