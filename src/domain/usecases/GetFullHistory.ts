// src/domain/usecases/GetFullHistory.ts
import type { Habit } from "@/domain/entities/Habit";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

/**
 * Caso de uso para obtener historial completo agrupado por meses y semanas.
 * Usa fechas locales (YYYY-MM-DD) para agrupar correctamente.
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

/** "YYYY-MM-DD" local -> next day "YYYY-MM-DD" local */
function nextDate(dateStr: string): string {
  const { y, m, d } = parseYMD(dateStr);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  return toLocalYMD(dt);
}

/** "YYYY-MM-DD" local -> weekday 0..6 */
function getWeekDayFromLocalDate(dateStr: string): number {
  const { y, m, d } = parseYMD(dateStr);
  return new Date(y, m - 1, d).getDay(); // 0..6
}

/**
 * Devuelve el lunes de la semana de dateStr (LOCAL)
 * - Lunes como inicio de semana
 */
function getWeekStart(dateStr: string): string {
  const { y, m, d } = parseYMD(dateStr);
  const dt = new Date(y, m - 1, d);
  const day = dt.getDay(); // 0..6 (Dom=0)
  const diffToMonday = (day + 6) % 7; // Dom(0)->6, Lun(1)->0, ...
  dt.setDate(dt.getDate() - diffToMonday);
  return toLocalYMD(dt);
}

/**
 * Determina si el hábito estaba "programado" en ese día (según schedule).
 */
function isDayScheduled(habit: Habit, dateStr: string): boolean {
  const schedule: any = (habit as any)?.schedule;

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

// =====================
// Types
// =====================

export type WeekSummary = {
  weekStart: string; // "YYYY-MM-DD" (lunes de la semana)
  days: {
    date: string; // "YYYY-MM-DD"
    label: string; // "Lun", "Mar", ...
    totalPlanned: number;
    totalDone: number;
    completionRate: number; // 0..1
  }[];
};

export type MonthGroup = {
  year: number;
  month: number; // 1..12
  monthLabel: string; // "Enero 2024"
  weeks: WeekSummary[];
};

export type FullHistory = {
  months: MonthGroup[];
  totalMonths: number;
};

// =====================
// Use Case
// =====================

export class GetFullHistory {
  constructor(
    private habitRepository: HabitRepository,
    private habitLogRepository: HabitLogRepository
  ) {}

  /**
   * Obtiene historial completo agrupado por meses y semanas.
   * El histórico comienza desde el primer registro real (MIN(date) en habit_logs).
   * Si no hay registros, usa el inicio de la semana actual.
   * 
   * IMPORTANTE: El histórico es "Smart & Clean" - solo muestra desde el primer check del usuario.
   * No muestra días anteriores al primer registro.
   * 
   * @param fromDate Fecha desde la cual obtener historial (YYYY-MM-DD, inclusive). 
   *                  Si no se proporciona, usa automáticamente MIN(date) de habit_logs.
   * @param toDate Fecha hasta la cual obtener historial (YYYY-MM-DD, inclusive). 
   *               Si no se proporciona, usa hoy.
   */
  async execute(params: {
    fromDate?: string; // "YYYY-MM-DD", opcional - si no se proporciona, usa MIN(date)
    toDate?: string; // "YYYY-MM-DD", opcional, por defecto hoy
  }): Promise<FullHistory> {
    const { fromDate, toDate } = params;
    const endDate = toDate || toLocalYMD(new Date());

    // Obtener fecha mínima de habit_logs (primer registro real)
    // Este es el "Punto Cero" del histórico
    const earliestDate = await this.habitLogRepository.getEarliestLogDate();
    
    let startDate: string;
    if (fromDate) {
      // Si se proporciona fromDate, usarla pero asegurar que no sea anterior al primer registro
      if (earliestDate && fromDate < earliestDate) {
        startDate = earliestDate;
      } else {
        startDate = fromDate;
      }
    } else {
      // Si no se proporciona fromDate, usar el primer registro real
      if (earliestDate) {
        startDate = earliestDate;
      } else {
        // Si no hay registros, usar inicio de semana actual
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diffToMonday = (dayOfWeek + 6) % 7; // Dom(0)->6, Lun(1)->0, ...
        today.setDate(today.getDate() - diffToMonday);
        startDate = toLocalYMD(today);
      }
    }

    // Obtener todos los hábitos
    const habits = await this.habitRepository.getAll();

    // Generar todas las fechas en el rango (desde startDate hasta endDate, inclusive)
    // Esto rellena todos los días para mantener continuidad visual
    const dates: string[] = [];
    let current = startDate;
    while (current <= endDate) {
      dates.push(current);
      current = nextDate(current);
    }

    // Obtener logs para cada fecha en el rango
    const logsByDate = new Map<string, Map<string, boolean>>(); // date -> habitId -> done

    const allLogsPromises = dates.map((dateStr) =>
      this.habitLogRepository.getLogsForDate(dateStr)
    );
    const allLogsArrays = await Promise.all(allLogsPromises);

    for (let i = 0; i < dates.length; i++) {
      const dateStr = dates[i];
      const logs = allLogsArrays[i] || [];

      const dateMap = new Map<string, boolean>();
      for (const log of logs) {
        if (log.done) {
          dateMap.set(log.habitId, true);
        }
      }
      logsByDate.set(dateStr, dateMap);
    }

    // Agrupar por semanas
    const weeksMap = new Map<string, WeekSummary>(); // weekStart -> WeekSummary

    const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    for (const dateStr of dates) {
      const weekStart = getWeekStart(dateStr);
      const weekday = getWeekDayFromLocalDate(dateStr);

      if (!weeksMap.has(weekStart)) {
        weeksMap.set(weekStart, {
          weekStart,
          days: [],
        });
      }

      const week = weeksMap.get(weekStart)!;

      // Calcular stats para este día
      const applicableHabits = habits.filter((h) =>
        isDayScheduled(h, dateStr)
      );

      const doneByHabitId =
        logsByDate.get(dateStr) || new Map<string, boolean>();

      const totalPlanned = applicableHabits.length;
      const totalDone = applicableHabits.filter((h) =>
        doneByHabitId.has(h.id) && doneByHabitId.get(h.id) === true
      ).length;

      const completionRate =
        totalPlanned === 0 ? 0 : totalDone / totalPlanned;

      week.days.push({
        date: dateStr,
        label: DAY_LABELS[weekday],
        totalPlanned,
        totalDone,
        completionRate,
      });
    }

    // Ordenar semanas por fecha (más reciente primero)
    // Y ordenar días dentro de cada semana
    const weeks = Array.from(weeksMap.values())
      .map((week) => ({
        ...week,
        days: week.days.sort((a, b) => (a.date > b.date ? 1 : -1)),
      }))
      .sort((a, b) => (b.weekStart > a.weekStart ? 1 : -1));

    // Agrupar semanas por mes
    const monthsMap = new Map<string, MonthGroup>(); // "YYYY-MM" -> MonthGroup

    const monthLabels = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    for (const week of weeks) {
      // Usar el primer día de la semana para determinar el mes
      const firstDay = week.days[0]?.date || week.weekStart;
      const { y, m } = parseYMD(firstDay);
      const monthKey = `${y}-${String(m).padStart(2, "0")}`;

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
          year: y,
          month: m,
          monthLabel: `${monthLabels[m - 1]} ${y}`,
          weeks: [],
        });
      }

      monthsMap.get(monthKey)!.weeks.push(week);
    }

    // Ordenar meses por fecha (más reciente primero)
    const months = Array.from(monthsMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return {
      months,
      totalMonths: months.length,
    };
  }
}
