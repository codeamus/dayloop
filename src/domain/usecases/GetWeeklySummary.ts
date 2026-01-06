// src/domain/usecases/GetWeeklySummary.ts
import type { Habit } from "@/domain/entities/Habit";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

export type DaySummary = {
  date: string; // 'YYYY-MM-DD'
  label: string; // 'Lun', 'Mar', ...
  totalPlanned: number; // hábitos que aplican ese día
  totalDone: number; // hábitos marcados como done
  completionRate: number; // 0..1
};

// Lunes → Domingo (1..0)
const DAY_LABELS_MON_SUN = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parse 'YYYY-MM-DD' en hora local, fijando al mediodía para evitar bugs de DST.
 */
function parseLocalYMDNoon(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

/**
 * Devuelve 0..6 para Lun..Dom
 */
function weekdayMon0(d: Date): number {
  // JS getDay(): Dom=0, Lun=1, ... Sáb=6
  // Queremos: Lun=0, ... Dom=6
  return (d.getDay() + 6) % 7;
}

/**
 * Retorna el lunes de la semana (Lun..Dom) de la fecha dada.
 */
function startOfWeekMonday(d: Date): Date {
  const out = new Date(d);
  out.setHours(12, 0, 0, 0);
  const diff = weekdayMon0(out); // 0 si ya es lunes
  out.setDate(out.getDate() - diff);
  return out;
}

function isHabitScheduledForDate(habit: Habit, d: Date): boolean {
  const dayOfWeek = d.getDay(); // 0-6 (Dom-Sáb)
  const schedule = habit.schedule;

  if (!schedule || !("type" in schedule)) return true;

  if (schedule.type === "daily") return true;

  if (schedule.type === "weekly") {
    const days = Array.isArray(schedule.daysOfWeek) ? schedule.daysOfWeek : [];
    const normalized = days.map((x: any) => Number(x)).filter(Number.isFinite);
    return normalized.includes(dayOfWeek);
  }

  return true;
}

export class GetWeeklySummary {
  constructor(
    private habitRepository: HabitRepository,
    private habitLogRepository: HabitLogRepository
  ) {}

  /**
   * Semana calendario Lunes → Domingo (7 días),
   * basada en referenceDate ('YYYY-MM-DD' local).
   */
  async execute(referenceDate: string): Promise<DaySummary[]> {
    const ref = parseLocalYMDNoon(referenceDate);

    const habits = await this.habitRepository.getAll();

    const monday = startOfWeekMonday(ref);

    // 7 días: Lun..Dom
    const days: Date[] = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      day.setHours(12, 0, 0, 0);
      return day;
    });

    const dateStrs = days.map(formatDateYMD);

    const logsByDay = await Promise.all(
      dateStrs.map((ds) => this.habitLogRepository.getLogsForDate(ds))
    );

    const results: DaySummary[] = days.map((day, idx) => {
      const logs = logsByDay[idx] ?? [];

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

      return {
        date: dateStrs[idx],
        label: DAY_LABELS_MON_SUN[idx], // Lun..Dom
        totalPlanned,
        totalDone,
        completionRate,
      };
    });

    return results;
  }
}
