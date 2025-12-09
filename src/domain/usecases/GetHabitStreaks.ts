// src/domain/usecases/GetHabitStreaks.ts
import type { Habit, HabitId } from "@/domain/entities/Habit";
import type { HabitLog } from "@/domain/entities/HabitLog";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

export type FrequencyType = "daily" | "weekly" | "monthly";

export type HabitStreak = {
  habitId: HabitId;
  currentDailyStreak: number;
  bestDailyStreak: number;
  currentWeeklyStreak: number;
  bestWeeklyStreak: number;
};

export class GetHabitStreaks {
  constructor(
    private readonly habitRepo: HabitRepository,
    private readonly logRepo: HabitLogRepository
  ) {}

  async execute(habitId: HabitId, todayStr?: string): Promise<HabitStreak> {
    const habit = await this.habitRepo.getById(habitId);
    if (!habit) {
      throw new Error("Habit not found");
    }

    const today = todayStr ?? new Date().toISOString().slice(0, 10);
    const logs = await this.logRepo.getLogsForHabit(habitId);

    const { current: currentDailyStreak, best: bestDailyStreak } =
      calculateDailyStreak(habit, logs, today);

    const { current: currentWeeklyStreak, best: bestWeeklyStreak } =
      calculateWeeklyStreak(habit, logs, today);

    return {
      habitId,
      currentDailyStreak,
      bestDailyStreak,
      currentWeeklyStreak,
      bestWeeklyStreak,
    };
  }
}

/* ===== Helpers ===== */

function isDayScheduled(habit: Habit, date: string): boolean {
  const d = new Date(date + "T00:00:00");
  const weekDay = d.getDay(); // 0-6 (domingo-sábado)

  if (habit.schedule.type === "daily") return true;

  return habit.schedule.daysOfWeek.includes(weekDay);
}

function previousDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function calculateDailyStreak(
  habit: Habit,
  logs: HabitLog[],
  today: string
): { current: number; best: number } {
  const logMap = new Map<string, HabitLog>();
  for (const log of logs) {
    logMap.set(log.date, log);
  }

  // BEST
  const dates = Array.from(logMap.keys()).sort();
  let best = 0;
  let run = 0;

  for (const date of dates) {
    if (!isDayScheduled(habit, date)) continue;

    const l = logMap.get(date);
    if (l?.done) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  // CURRENT (desde hoy hacia atrás)
  let current = 0;
  let cursor = today;

  while (true) {
    if (!isDayScheduled(habit, cursor)) {
      cursor = previousDate(cursor);
      continue;
    }

    const l = logMap.get(cursor);
    if (l?.done) {
      current++;
      cursor = previousDate(cursor);
      continue;
    }

    break;
  }

  return { current, best };
}

/* ===== Weekly streak (solo weekly) ===== */

type WeekKey = string; // "2025-48"

function getWeekKey(dateStr: string): WeekKey {
  const d = new Date(dateStr + "T00:00:00");
  const year = d.getFullYear();

  const tmp = new Date(d.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);

  const weekNumber =
    1 +
    Math.round(
      ((tmp.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );

  return `${year}-${weekNumber}`;
}

function previousWeek(weekKey: WeekKey): WeekKey {
  const [yearStr, weekStr] = weekKey.split("-");
  let year = Number(yearStr);
  let week = Number(weekStr) - 1;

  if (week < 1) {
    year = year - 1;
    week = 52; // aproximación suficiente para tu caso
  }
  return `${year}-${week}`;
}

function getAllDatesForWeek(year: number, week: number): string[] {
  // lunes de esa semana ISO
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = (simple.getDay() + 6) % 7; // 0 = lunes
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - dayOfWeek);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function calculateWeeklyStreak(
  habit: Habit,
  logs: HabitLog[],
  today: string
): { current: number; best: number } {
  if (habit.schedule.type !== "weekly") {
    return { current: 0, best: 0 };
  }

  const logMap = new Map<string, HabitLog>();
  for (const log of logs) logMap.set(log.date, log);

  const weeks = new Set<WeekKey>();
  for (const date of logMap.keys()) {
    weeks.add(getWeekKey(date));
  }

  function isWeekComplete(weekKey: WeekKey): boolean {
    const [yearStr, weekStr] = weekKey.split("-");
    const year = Number(yearStr);
    const week = Number(weekStr);

    const weekDates = getAllDatesForWeek(year, week);
    const scheduledDates = weekDates.filter((d) => isDayScheduled(habit, d));

    if (scheduledDates.length === 0) return false;

    return scheduledDates.every((date) => {
      const l = logMap.get(date);
      return l?.done === true;
    });
  }

  const sortedWeeks = Array.from(weeks.values()).sort();
  let best = 0;
  let run = 0;
  for (const wk of sortedWeeks) {
    if (isWeekComplete(wk)) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  const todayWeek = getWeekKey(today);
  let current = 0;
  let cursor = todayWeek;
  while (true) {
    if (isWeekComplete(cursor)) {
      current++;
      cursor = previousWeek(cursor);
    } else {
      break;
    }
  }

  return { current, best };
}
