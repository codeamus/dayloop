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
  const h = Number(startTime.split(":")[0]);
  if (!Number.isFinite(h)) return "morning";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function getDayOfWeekFromLocalDate(date: unknown): number {
  const s = safeString(date, todayISO());
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y || 2000, (m || 1) - 1, d || 1).getDay();
}

function getDayOfMonthFromLocalDate(date: unknown): number {
  const s = safeString(date, todayISO());
  const d = Number(s.split("-")[2]);
  return Number.isFinite(d) ? d : new Date().getDate();
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
    date?: unknown;
  }): Promise<{ ok: true; habit: Habit } | { ok: false }> {
    try {
      const name = safeString(input.name, "").trim();
      if (!name) return { ok: false };

      const habitId = newId();

      const startTime = safeHHmm(input.startTime, "08:00");
      const endTime = safeHHmm(input.endTime, "08:30");
      const timeOfDay = getTimeOfDayFromHour(startTime);

      const reminderOffsetMinutes =
        input.reminderOffsetMinutes == null
          ? null
          : Number(input.reminderOffsetMinutes);

      let schedule: HabitSchedule;

      if (input.type === "weekly") {
        const days = uniqueSortedNumbers(input.weeklyDays).filter(
          (d) => d >= 0 && d <= 6
        );
        schedule = {
          type: "weekly",
          daysOfWeek: days.length
            ? days
            : [getDayOfWeekFromLocalDate(input.date)],
        };
      } else if (input.type === "monthly") {
        const days = uniqueSortedNumbers(input.monthDays).filter(
          (d) => d >= 1 && d <= 31
        );
        schedule = {
          type: "monthly",
          daysOfMonth: days.length
            ? days
            : [getDayOfMonthFromLocalDate(input.date)],
        };
      } else {
        schedule = { type: "daily" };
      }

      const habit: Habit = {
        id: habitId,
        name,
        icon: safeString(input.icon, "🔥"),
        color: safeString(input.color, "#e6bc01"),
        schedule,
        startTime,
        endTime,
        time: startTime,
        timeOfDay,
        reminderOffsetMinutes: Number.isFinite(reminderOffsetMinutes as number)
          ? (reminderOffsetMinutes as number)
          : null,
        calendarEventId: null,
        endCondition: { type: "none" },
        notificationIds: [],
      };

      // 1) Guardar hábito
      await this.habitRepository.create(habit);

      // 2) Programar notificaciones
      const plan: HabitNotificationPlan = {
        habitId,
        name,
        icon: habit.icon,
        startTime,
        schedule: schedule as any,
        reminderOffsetMinutes: habit.reminderOffsetMinutes,
      };

      const ids = await this.notificationScheduler.scheduleForHabit(plan);

      // 3) Persistir IDs
      habit.notificationIds = ids;
      await this.habitRepository.updateNotifications(habitId, ids);

      return { ok: true, habit };
    } catch (e) {
      console.error("[CreateHabit] failed", e);
      return { ok: false };
    }
  }
}
