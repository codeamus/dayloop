// src/infraestructure/notifications/ExpoNotificationScheduler.ts
import type {
  HabitNotificationPlan,
  NotificationScheduler,
} from "@/domain/services/NotificationScheduler";
import * as Notifications from "expo-notifications";

function parseHHmm(s: string): { h: number; m: number } {
  const [hh, mm] = (s ?? "").split(":").map((x) => Number(x));
  return {
    h: Number.isFinite(hh) ? hh : 8,
    m: Number.isFinite(mm) ? mm : 0,
  };
}

function toMinutes(h: number, m: number) {
  return h * 60 + m;
}

function clampDayMinute(total: number) {
  let x = total % 1440;
  if (x < 0) x += 1440;
  return x;
}

function buildTitle(plan: HabitNotificationPlan) {
  return `${plan.icon} ${plan.name}`;
}

function buildBody(_plan: HabitNotificationPlan) {
  return "Hora de tu hábito 💛";
}

function computeReminderHM(plan: HabitNotificationPlan) {
  const { h, m } = parseHHmm(plan.startTime);
  const base = toMinutes(h, m);

  const offset =
    typeof plan.reminderOffsetMinutes === "number" &&
    Number.isFinite(plan.reminderOffsetMinutes)
      ? plan.reminderOffsetMinutes
      : 0;

  const reminderMin = clampDayMinute(base - offset);
  return {
    hour: Math.floor(reminderMin / 60),
    minute: reminderMin % 60,
  };
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfToday(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isValidDate(x: Date) {
  return x instanceof Date && !Number.isNaN(x.getTime());
}

function nextOccurrences(plan: HabitNotificationPlan, horizonDays: number) {
  const now = new Date();
  const minFuture = new Date(now.getTime() + 60 * 1000); // >= 60s al futuro
  const { hour, minute } = computeReminderHM(plan);

  const out: Date[] = [];
  const base = startOfToday(now);

  const pushIfFuture = (d: Date) => {
    if (!isValidDate(d)) return;
    if (d.getTime() >= minFuture.getTime()) out.push(d);
  };

  if (plan.schedule.type === "daily") {
    for (let i = 0; i <= horizonDays; i++) {
      const d = addDays(base, i);
      d.setHours(hour, minute, 0, 0);
      pushIfFuture(d);
    }
    return out;
  }

  if (plan.schedule.type === "weekly") {
    const days = Array.isArray(plan.schedule.daysOfWeek)
      ? plan.schedule.daysOfWeek
      : [];
    const set = new Set(
      days
        .map((x) => Math.trunc(Number(x)))
        .filter((x) => Number.isFinite(x) && x >= 0 && x <= 6)
    );
    if (!set.size) return out;

    for (let i = 0; i <= horizonDays; i++) {
      const d = addDays(base, i);
      const dow = d.getDay(); // 0..6
      if (!set.has(dow)) continue;
      d.setHours(hour, minute, 0, 0);
      pushIfFuture(d);
    }
    return out;
  }

  if (plan.schedule.type === "monthly") {
    const days = Array.isArray(plan.schedule.daysOfMonth)
      ? plan.schedule.daysOfMonth
      : [];
    const set = new Set(
      days
        .map((x) => Math.trunc(Number(x)))
        .filter((x) => Number.isFinite(x) && x >= 1 && x <= 31)
    );
    if (!set.size) return out;

    for (let i = 0; i <= horizonDays; i++) {
      const d = addDays(base, i);
      const dom = d.getDate(); // 1..31
      if (!set.has(dom)) continue;
      d.setHours(hour, minute, 0, 0);
      pushIfFuture(d);
    }
    return out;
  }

  return out;
}

export class ExpoNotificationScheduler implements NotificationScheduler {
  async cancel(notificationIds: string[]): Promise<void> {
    const ids = (notificationIds ?? []).filter((x) => typeof x === "string");
    await Promise.all(
      ids.map(async (id) => {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {
          // ignore
        }
      })
    );
  }

  // ✅ cancel robusto: mira el sistema y cancela TODOS los que correspondan al hábito
  async cancelByHabitId(habitId: string): Promise<void> {
    if (!habitId) return;

    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();

      const toCancel = scheduled
        .filter((n) => (n?.content?.data as any)?.habitId === habitId)
        .map((n) => n.identifier)
        .filter((id) => typeof id === "string" && id.length > 0);

      if (!toCancel.length) return;

      await Promise.all(
        toCancel.map(async (id) => {
          try {
            await Notifications.cancelScheduledNotificationAsync(id);
          } catch {
            // ignore
          }
        })
      );
    } catch (e) {
      console.warn("[ExpoNotificationScheduler] cancelByHabitId failed", e);
    }
  }

  async scheduleForHabit(
    plan: HabitNotificationPlan,
    options?: { horizonDays?: number }
  ): Promise<string[]> {
    const horizonDays =
      typeof options?.horizonDays === "number" &&
      Number.isFinite(options.horizonDays)
        ? Math.max(1, Math.min(365, Math.trunc(options.horizonDays)))
        : 30;

    const dates = nextOccurrences(plan, horizonDays);
    const ids: string[] = [];

    for (const date of dates) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: buildTitle(plan),
          body: buildBody(plan),
          data: { habitId: plan.habitId, kind: "habit_reminder" },
        },
        trigger: { type: "date", date },
      });

      ids.push(id);
    }

    return ids;
  }
}
