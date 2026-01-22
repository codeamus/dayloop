// src/domain/usecases/CreateHabit.ts
import type { Habit, HabitSchedule, TimeOfDay } from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";
import type {
  HabitNotificationPlan,
  NotificationScheduler,
} from "@/domain/services/NotificationScheduler";
import { newId } from "@/utils/shared/id";

function safeString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function safeHHmm(v: unknown, fallback: string): string {
  const s = safeString(v, fallback);
  return /^\d{2}:\d{2}$/.test(s) ? s : fallback;
}

function uniqueSortedNumbers(xs: unknown): number[] {
  if (!Array.isArray(xs)) return [];
  const nums = xs
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n))
    .map((n) => Math.trunc(n));
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function getTimeOfDayFromHour(startTime: unknown): TimeOfDay {
  if (typeof startTime !== "string") return "morning";
  const hPart = startTime.split(":")[0];
  const h = Number(hPart);
  if (!Number.isFinite(h)) return "morning";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDayOfWeekFromLocalDate(date: unknown): number {
  const s = safeString(date, todayISO());
  const [yy, mm, dd] = s.split("-").map(Number);
  const y = Number.isFinite(yy) ? yy : 2000;
  const m = Number.isFinite(mm) ? mm : 1;
  const d = Number.isFinite(dd) ? dd : 1;
  const dt = new Date(y, m - 1, d);
  return dt.getDay(); // 0..6
}

function getDayOfMonthFromLocalDate(date: unknown): number {
  const s = safeString(date, todayISO());
  const parts = s.split("-").map(Number);
  const dd = parts[2];
  return Number.isFinite(dd) ? dd : new Date().getDate();
}

export class CreateHabit {
  constructor(
    private habitRepository: HabitRepository,
    private notificationScheduler: NotificationScheduler
  ) {}

  async execute(input: {
    name: string;
    icon: string;
    color: string;
    type: "daily" | "weekly" | "monthly";
    startTime?: unknown;
    endTime?: unknown;
    weeklyDays?: unknown;
    monthDays?: unknown;
    reminderOffsetMinutes?: unknown;
    reminderTimes?: unknown;
    date?: unknown;
    targetRepeats?: unknown;
  }): Promise<{ ok: true; habit: Habit } | { ok: false }> {
    try {
      const name = safeString(input.name, "").trim();
      if (!name) return { ok: false };

      const icon = safeString(input.icon, "🔥");
      const color = safeString(input.color, "#e6bc01");

      const startTime = safeHHmm(input.startTime, "08:00");
      const endTime = safeHHmm(input.endTime, "08:30");
      const timeOfDay = getTimeOfDayFromHour(startTime);

      const reminderOffsetMinutes =
        input.reminderOffsetMinutes === null ||
        input.reminderOffsetMinutes === undefined
          ? null
          : Number(input.reminderOffsetMinutes);

      // Parsear reminderTimes (array de strings "HH:mm")
      let reminderTimes: string[] | undefined;
      if (Array.isArray(input.reminderTimes)) {
        reminderTimes = input.reminderTimes
          .filter((t) => typeof t === "string" && /^\d{2}:\d{2}$/.test(t))
          .sort();
      }

      const targetRepeats =
        input.targetRepeats === null || input.targetRepeats === undefined
          ? 1
          : Math.max(1, Math.floor(Number(input.targetRepeats)) || 1);

      const type = input.type ?? "daily";

      let schedule: HabitSchedule;

      if (type === "weekly") {
        const days = uniqueSortedNumbers(input.weeklyDays).filter(
          (d) => d >= 0 && d <= 6
        );
        const fallbackDay = getDayOfWeekFromLocalDate(input.date);
        schedule = {
          type: "weekly",
          daysOfWeek: days.length ? days : [fallbackDay],
        };
      } else if (type === "monthly") {
        const days = uniqueSortedNumbers(input.monthDays).filter(
          (d) => d >= 1 && d <= 31
        );
        const fallbackDay = getDayOfMonthFromLocalDate(input.date);
        schedule = {
          type: "monthly",
          daysOfMonth: days.length ? days : [fallbackDay],
        };
      } else {
        schedule = { type: "daily" };
      }

      const habitId = newId();

      const habit: Habit = {
        id: habitId,
        name,
        icon,
        color,
        schedule,
        startTime,
        endTime,
        time: startTime,
        timeOfDay,
        reminderOffsetMinutes: Number.isFinite(reminderOffsetMinutes as number)
          ? (reminderOffsetMinutes as number)
          : null,
        reminderTimes,
        calendarEventId: null,
        endCondition: { type: "none" },

        notificationIds: [],
        isPaused: false,
        pausedAt: null,
        pauseReason: null,
        targetRepeats,
      };

      await this.habitRepository.create(habit);

      const plan: HabitNotificationPlan = {
        habitId,
        name,
        icon,
        startTime,
        schedule: schedule as any,
        reminderOffsetMinutes: habit.reminderOffsetMinutes ?? null,
        reminderTimes: habit.reminderTimes,
      };

      // ✅ NO dispara ahora al crear (solo agenda)
      const ids = await this.notificationScheduler.scheduleForHabit(plan, {
        horizonDays: 30,
      });


      habit.notificationIds = ids;
      await this.habitRepository.updateNotifications(habitId, ids);

      return { ok: true, habit };
    } catch (e) {
      console.error("[CreateHabit] failed", e);
      return { ok: false };
    }
  }
}
