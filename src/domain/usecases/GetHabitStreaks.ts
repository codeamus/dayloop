// src/domain/usecases/GetHabitStreaks.ts
import type { Habit } from "@/domain/entities/Habit";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

/**
 * =========================
 * Utils fechas LOCALES
 * (evita bugs UTC con new Date("YYYY-MM-DD"))
 * =========================
 */

// "YYYY-MM-DD" -> Date LOCAL (no UTC)
function parseLocalYMD(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1);
}

// Date -> "YYYY-MM-DD" LOCAL
function toLocalYMD(d: Date): string {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

// "YYYY-MM-DD" + N días -> "YYYY-MM-DD" LOCAL
function addDaysLocalYMD(dateStr: string, days: number): string {
  const dt = parseLocalYMD(dateStr);
  dt.setDate(dt.getDate() + days);
  return toLocalYMD(dt);
}

// "YYYY-MM-DD" - 1 día -> "YYYY-MM-DD" LOCAL
function previousDate(dateStr: string): string {
  return addDaysLocalYMD(dateStr, -1);
}

// "YYYY-MM-DD" -> weekday 0..6 (LOCAL)
function getWeekDayFromLocalDate(dateStr: string): number {
  return parseLocalYMD(dateStr).getDay(); // 0..6
}

/**
 * Devuelve el lunes de la semana de dateStr (LOCAL)
 * - Lunes como inicio de semana
 */
function getWeekStart(dateStr: string): string {
  const dt = parseLocalYMD(dateStr);
  const day = dt.getDay(); // 0..6 (Dom=0)
  const diffToMonday = (day + 6) % 7; // Dom(0)->6, Lun(1)->0, ...
  dt.setDate(dt.getDate() - diffToMonday);
  return toLocalYMD(dt);
}

/**
 * Días programados para cálculo de streak semanal (0..6)
 * - daily: [0..6]
 * - weekly: daysOfWeek
 * - monthly: NO participa en weekly streak
 */
function getScheduledWeekDays(habit: Habit): number[] {
  const schedule: any = habit?.schedule;

  if (!schedule || typeof schedule !== "object") {
    // fallback: lo tratamos como daily para no romper
    return [0, 1, 2, 3, 4, 5, 6];
  }

  if (schedule.type === "daily") return [0, 1, 2, 3, 4, 5, 6];

  if (schedule.type === "weekly") {
    return Array.isArray(schedule.daysOfWeek) ? schedule.daysOfWeek : [];
  }

  return [];
}

/**
 * ¿Día programado?
 * - daily: true
 * - weekly: incluye weekday
 * - monthly: incluye dayOfMonth (1..31)
 *
 * Nota: Si monthly viene sin daysOfMonth, retornamos false
 * para que NO se comporte como daily.
 */
function isDayScheduled(habit: Habit, dateStr: string): boolean {
  const schedule: any = (habit as any)?.schedule;

  // Si está roto, no bloqueamos la app: lo tratamos como "daily"
  if (!schedule || typeof schedule !== "object") return true;

  if (schedule.type === "daily") return true;

  if (schedule.type === "weekly") {
    const wd = getWeekDayFromLocalDate(dateStr);
    const days = Array.isArray(schedule.daysOfWeek) ? schedule.daysOfWeek : [];
    return days.includes(wd);
  }

  if (schedule.type === "monthly") {
    const dayOfMonth = Number(dateStr.split("-")[2]);
    const days = Array.isArray(schedule.daysOfMonth)
      ? schedule.daysOfMonth
      : [];
    if (days.length === 0) return false;
    return days.includes(dayOfMonth);
  }

  return true;
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

    // Logs del hábito
    const logs = await this.habitLogRepository.getLogsForHabit(habitId);
    const targetRepeats = habit.targetRepeats ?? 1;

    // Un día cuenta para streak solo si progress >= targetRepeats (o done=true para compatibilidad)
    const doneSet = new Set(
      logs
        .filter((l) => {
          // Si tiene progress, verificar progress >= targetRepeats
          if (l.progress !== undefined) {
            return l.progress >= targetRepeats;
          }
          // Fallback: usar done para compatibilidad con datos antiguos
          return l.done;
        })
        .map((l) => l.date)
    ); // "YYYY-MM-DD"
    const doneDatesSorted = Array.from(doneSet).sort();

    const today = toLocalYMD(new Date());

    // =====================================================
    // DAILY STREAK (hoy hacia atrás, saltando no-programados)
    // =====================================================
    let currentDaily = 0;
    let cursor = today;

    while (true) {
      // si ese día NO estaba programado, lo saltamos hacia atrás
      if (!isDayScheduled(habit, cursor)) {
        cursor = previousDate(cursor);
        continue;
      }

      if (doneSet.has(cursor)) {
        currentDaily++;
        cursor = previousDate(cursor);
        continue;
      }

      break;
    }

    // Best daily streak histórico
    let bestDaily = 0;

    for (const start of doneDatesSorted) {
      let streak = 0;
      let c = start;

      while (true) {
        if (!isDayScheduled(habit, c)) {
          c = previousDate(c);
          continue;
        }

        if (doneSet.has(c)) {
          streak++;
          c = previousDate(c);
          continue;
        }

        break;
      }

      bestDaily = Math.max(bestDaily, streak);
    }

    // =====================================================
    // WEEKLY STREAK REAL (semanas completas consecutivas)
    // - Solo para daily/weekly
    // - Semana completa = TODOS los días programados de esa semana hechos
    // =====================================================
    const scheduledWeekDays = getScheduledWeekDays(habit);

    // monthly (o weekly vacío) no aplica
    if (scheduledWeekDays.length === 0) {
      return {
        currentDailyStreak: currentDaily,
        bestDailyStreak: bestDaily,
        currentWeeklyStreak: 0,
        bestWeeklyStreak: 0,
      };
    }

    // Agrupar checks por semana -> set de weekdays hechos
    const weeks = new Map<string, Set<number>>();
    for (const dateStr of doneSet) {
      const weekStart = getWeekStart(dateStr); // lunes
      const wd = getWeekDayFromLocalDate(dateStr);

      if (!weeks.has(weekStart)) weeks.set(weekStart, new Set());
      weeks.get(weekStart)!.add(wd);
    }

    // Semana cumplida = contiene TODOS los weekdays programados
    const completedWeeks = Array.from(weeks.entries())
      .filter(([_, daysDone]) =>
        scheduledWeekDays.every((d) => daysDone.has(d))
      )
      .map(([weekStart]) => weekStart)
      .sort();

    const completedSet = new Set(completedWeeks);

    // Best weekly streak (consecutiva)
    // ✅ FIX: NO usar new Date("YYYY-MM-DD") (UTC). Usamos addDaysLocalYMD.
    let bestWeekly = 0;
    let wStreak = 0;

    for (let i = 0; i < completedWeeks.length; i++) {
      if (i === 0) {
        wStreak = 1;
      } else {
        const expected = addDaysLocalYMD(completedWeeks[i - 1], 7);
        wStreak = expected === completedWeeks[i] ? wStreak + 1 : 1;
      }
      bestWeekly = Math.max(bestWeekly, wStreak);
    }

    // Current weekly streak (desde semana actual hacia atrás)
    // ✅ FIX: no includes + new Date(cursorWeek); usamos Set + addDaysLocalYMD(-7)
    let currentWeekly = 0;
    let cursorWeek = getWeekStart(today);

    while (completedSet.has(cursorWeek)) {
      currentWeekly++;
      cursorWeek = addDaysLocalYMD(cursorWeek, -7);
    }

    return {
      currentDailyStreak: currentDaily,
      bestDailyStreak: bestDaily,
      currentWeeklyStreak: currentWeekly,
      bestWeeklyStreak: bestWeekly,
    };
  }
}
