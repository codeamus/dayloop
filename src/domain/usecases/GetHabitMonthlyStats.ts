// src/domain/usecases/GetHabitMonthlyStats.ts
import type { Habit } from "@/domain/entities/Habit";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

/**
 * Este use case entrega:
 * - Un "calendario" del mes con estado por día (done/missed/future/unscheduled)
 * - Métricas del mes (scheduledDays, doneDays, missedDays, completionRate)
 * - Rachas estilo opción B (históricas): pueden cruzar meses hacia atrás
 *
 * Importante:
 * - Trabajamos con fechas LOCALES "YYYY-MM-DD" para evitar issues de UTC.
 * - La lógica de schedule respeta daily/weekly/monthly.
 */

// =====================
// Local date helpers
// =====================

/** Date (local) -> "YYYY-MM-DD" */
function toLocalYMD(d: Date): string {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** "YYYY-MM-DD" -> { y, m, d } (m: 1..12) */
function parseYMD(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y: y || 2000, m: m || 1, d: d || 1 };
}

/** "YYYY-MM-DD" local -> previous day "YYYY-MM-DD" local */
function previousDate(dateStr: string): string {
  const { y, m, d } = parseYMD(dateStr);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return toLocalYMD(dt);
}

/** "YYYY-MM-DD" local -> weekday 0..6 */
function getWeekDayFromLocalDate(dateStr: string): number {
  const { y, m, d } = parseYMD(dateStr);
  return new Date(y, m - 1, d).getDay(); // 0..6
}

/** "YYYY-MM-DD" local -> dayOfMonth 1..31 */
function getDayOfMonthFromLocalDate(dateStr: string): number {
  const { y, m, d } = parseYMD(dateStr);
  return new Date(y, m - 1, d).getDate(); // 1..31
}

/** days in month (month: 1..12) */
function daysInMonth(year: number, month1to12: number): number {
  // new Date(year, month, 0) retorna el último día del mes anterior a "month"
  // por eso, month=2 => último día de febrero
  return new Date(year, month1to12, 0).getDate();
}

// =====================
// Schedule logic
// =====================

/**
 * Determina si el hábito estaba "programado" en ese día (según schedule).
 * - daily: siempre programado
 * - weekly: programado si weekday ∈ daysOfWeek
 * - monthly: programado si dayOfMonth ∈ daysOfMonth
 *
 * Nota: si monthly viene vacío, NO lo tratamos como daily (false).
 */
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

// =====================
// Types
// =====================

export type MonthlyDayState = "done" | "missed" | "unscheduled" | "future";

export type MonthlyDay = {
  date: string; // YYYY-MM-DD
  dayOfMonth: number; // 1..31
  isScheduled: boolean;
  done: boolean;
  state: MonthlyDayState;
};

export type MonthlyStats = {
  habitId: string;
  year: number;
  month: number; // 1..12

  // "Calendario" del mes: un ítem por día
  days: MonthlyDay[];

  // Métricas del mes (solo cuentan días programados)
  scheduledDays: number;
  doneDays: number;
  missedDays: number;
  completionRate: number; // 0..1

  /**
   * Opción B:
   * - currentMonthlyStreak: racha actual histórica (puede cruzar meses hacia atrás)
   * - bestMonthlyStreak: mejor racha histórica "anclada" a días del mes (si un día del mes
   *   pertenece a una racha que empezó antes, se cuenta completa)
   */
  currentMonthlyStreak: number;
  bestMonthlyStreak: number;
};

export class GetHabitMonthlyStats {
  constructor(
    private habitRepository: HabitRepository,
    private habitLogRepository: HabitLogRepository
  ) {}

  async execute(params: {
    habitId: string;
    year: number;
    month: number;
  }): Promise<MonthlyStats> {
    const { habitId, year, month } = params;

    const habit = await this.habitRepository.getById(habitId);
    if (!habit) {
      return {
        habitId,
        year,
        month,
        days: [],
        scheduledDays: 0,
        doneDays: 0,
        missedDays: 0,
        completionRate: 0,
        currentMonthlyStreak: 0,
        bestMonthlyStreak: 0,
      };
    }

    // Traemos logs del hábito
    // (si más adelante tienes MUCHA data, puedes optimizar con getLogsForHabitSince)
    const logs = await this.habitLogRepository.getLogsForHabit(habitId);

    // Set con fechas done (YYYY-MM-DD)
    const doneSet = new Set(logs.filter((l) => l.done).map((l) => l.date));

    // Hoy en local "YYYY-MM-DD"
    const today = toLocalYMD(new Date());

    // Días del mes solicitado
    const dim = daysInMonth(year, month);

    const days: MonthlyDay[] = [];

    let scheduledDays = 0;
    let doneDays = 0;
    let missedDays = 0;

    // =====================
    // Calendar + Month stats
    // =====================
    for (let day = 1; day <= dim; day++) {
      const dateStr = toLocalYMD(new Date(year, month - 1, day));
      const scheduled = isDayScheduled(habit, dateStr);
      const done = doneSet.has(dateStr);

      let state: MonthlyDayState;

      if (!scheduled) {
        state = "unscheduled";
      } else if (dateStr > today) {
        state = "future";
      } else if (done) {
        state = "done";
      } else {
        state = "missed";
      }

      // Métricas del mes: solo cuentan días programados
      if (scheduled) {
        scheduledDays += 1;
        if (done) doneDays += 1;
        if (state === "missed") missedDays += 1;
      }

      days.push({
        date: dateStr,
        dayOfMonth: day,
        isScheduled: scheduled,
        done,
        state,
      });
    }

    const completionRate = scheduledDays > 0 ? doneDays / scheduledDays : 0;

    // =====================
    // currentMonthlyStreak (Option B)
    // =====================
    // Racha actual histórica:
    // - parte desde HOY hacia atrás
    // - salta días NO programados
    // - se corta cuando encuentra un día programado NO hecho
    let currentMonthlyStreak = 0;
    let cursor = today;

    while (true) {
      if (!isDayScheduled(habit, cursor)) {
        cursor = previousDate(cursor);
        continue;
      }

      if (doneSet.has(cursor)) {
        currentMonthlyStreak += 1;
        cursor = previousDate(cursor);
        continue;
      }

      break;
    }

    // =====================
    // bestMonthlyStreak (Option B)
    // =====================
    // Mejor racha histórica "anclada" al mes:
    // - tomamos como posibles puntos de inicio SOLO días del mes que estén done
    // - desde ese día, contamos hacia atrás la racha completa aunque cruce mes
    let bestMonthlyStreak = 0;

    for (let i = 0; i < days.length; i++) {
      const it = days[i];
      if (!it.isScheduled || !it.done) continue;

      let streak = 0;
      let c = it.date;

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

      if (streak > bestMonthlyStreak) bestMonthlyStreak = streak;
    }

    return {
      habitId,
      year,
      month,
      days,
      scheduledDays,
      doneDays,
      missedDays,
      completionRate,
      currentMonthlyStreak,
      bestMonthlyStreak,
    };
  }
}
