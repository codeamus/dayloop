// src/domain/usecases/GetHabitStreaks.ts
import type { Habit } from "@/domain/entities/Habit";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

/**
 * Fecha LOCAL "YYYY-MM-DD" -> weekday 0..6
 * (evita UTC issues)
 */
function getWeekDayFromLocalDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y || 2000, (m || 1) - 1, d || 1);
  return dt.getDay(); // 0..6
}

/**
 * Fecha LOCAL "YYYY-MM-DD" -> dayOfMonth 1..31
 */
function getDayOfMonthFromLocalDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y || 2000, (m || 1) - 1, d || 1);
  return dt.getDate(); // 1..31
}

function isDayScheduled(habit: Habit, dateStr: string): boolean {
  const schedule: any = (habit as any)?.schedule;

  // Si está roto, no bloqueamos la app: lo tratamos como "daily"
  if (!schedule || typeof schedule !== "object") return true;

  const type = schedule.type;

  if (type === "daily") return true;

  if (type === "weekly") {
    const weekDay = getWeekDayFromLocalDate(dateStr);
    const days = Array.isArray(schedule.daysOfWeek) ? schedule.daysOfWeek : [];
    return days.includes(weekDay);
  }

  if (type === "monthly") {
    // Ajusta si tu monthly usa otro campo
    // Ej: daysOfMonth: number[] (1..31)
    const dayOfMonth = getDayOfMonthFromLocalDate(dateStr);
    const days = Array.isArray(schedule.daysOfMonth)
      ? schedule.daysOfMonth
      : [];

    // ✅ criterio recomendado:
    // - si viene vacío/undefined: no lo consideramos programado (false)
    //   (porque si no, un monthly vacío se comporta como daily)
    if (days.length === 0) return false;

    return days.includes(dayOfMonth);
  }

  // Cualquier cosa rara: no reventar
  return true;
}

function previousDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() - 1);

  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

type Streak = {
  currentDailyStreak: number;
  bestDailyStreak: number;
  currentWeeklyStreak: number;
  bestWeeklyStreak: number;
};

export class GetHabitStreaks {
  constructor(
    private habitRepository: HabitRepository,
    private habitLogRepository: HabitLogRepository
  ) {}

  async execute(habitId: string): Promise<Streak> {
    const habit = await this.habitRepository.getById(habitId);
    if (!habit) {
      return {
        currentDailyStreak: 0,
        bestDailyStreak: 0,
        currentWeeklyStreak: 0,
        bestWeeklyStreak: 0,
      };
    }

    // Traemos todos los logs del hábito
    const logs = await this.habitLogRepository.getLogsForHabit(habitId);

    const doneSet = new Set(
      logs.filter((l) => l.done).map((l) => l.date) // date: "YYYY-MM-DD"
    );

    // Ordenar fechas (asc) para best streak
    const datesSorted = Array.from(doneSet).sort();

    const today = (() => {
      const d = new Date();
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    })();

    // ===== Daily streak actual (hoy hacia atrás)
    let currentDaily = 0;
    let cursor = today;

    while (true) {
      // si ese día NO estaba programado, lo saltamos hacia atrás
      if (!isDayScheduled(habit, cursor)) {
        cursor = previousDate(cursor);
        continue;
      }

      if (doneSet.has(cursor)) {
        currentDaily += 1;
        cursor = previousDate(cursor);
        continue;
      }

      break;
    }

    // ===== Best daily streak histórico
    // recorremos desde cada día hecho hacia atrás contando consecutivos programados
    let bestDaily = 0;

    for (let i = 0; i < datesSorted.length; i++) {
      const start = datesSorted[i];
      let streak = 0;
      let c = start;

      while (true) {
        if (!isDayScheduled(habit, c)) {
          c = previousDate(c);
          continue;
        }

        if (doneSet.has(c)) {
          streak += 1;
          c = previousDate(c);
          continue;
        }

        break;
      }

      if (streak > bestDaily) bestDaily = streak;
    }

    // ===== Weekly streak (simple): cuenta semanas con al menos 1 check
    // (si después quieres "semanas consecutivas", lo mejoramos)
    // Por ahora: bestWeekly = max de semanas distintas con check en el historial
    const weekKey = (dateStr: string) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
      // ISO-ish week key simple (año-mes-dia del lunes)
      const day = dt.getDay(); // 0..6
      const diffToMon = (day + 6) % 7;
      dt.setDate(dt.getDate() - diffToMon);
      const yy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, "0");
      const dd = String(dt.getDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    };

    const weeks = new Set(datesSorted.map(weekKey));
    const bestWeekly = weeks.size;

    // currentWeekly: si esta semana tiene algún check
    const currentWeekKey = weekKey(today);
    const currentWeekly = Array.from(doneSet).some(
      (d) => weekKey(d) === currentWeekKey
    )
      ? 1
      : 0;

    return {
      currentDailyStreak: currentDaily,
      bestDailyStreak: bestDaily,
      currentWeeklyStreak: currentWeekly,
      bestWeeklyStreak: bestWeekly,
    };
  }
}
