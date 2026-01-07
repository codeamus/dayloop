// src/infraestructure/notifications/ExpoNotificationScheduler.ts
import type { Habit } from "@/domain/entities/Habit";
import type {
  HabitNotificationPlan,
  NotificationScheduler,
} from "@/domain/services/NotificationScheduler";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { buildHabitNotificationText } from "./notificationCopy";

function parseHHmm(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return {
    hour: Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 8,
    minute: Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0,
  };
}

// offset: minutos ANTES (si UI dice "5 min antes", acá RESTAMOS 5)
function applyOffset(hour: number, minute: number, offsetMin: number) {
  const total = hour * 60 + minute - offsetMin;
  const minutesInDay = 24 * 60;
  const norm = ((total % minutesInDay) + minutesInDay) % minutesInDay;
  return { hour: Math.floor(norm / 60), minute: norm % 60 };
}

function habitBaseId(habitId: string) {
  return `habit-${habitId}`;
}

async function safeCancel(id: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore
  }
}

function startOfTodayLocal() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function nextDailyDateAt(hour: number, minute: number) {
  const now = new Date();
  const base = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hour,
    minute,
    0,
    0
  );
  if (base.getTime() > now.getTime()) return base;

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    hour,
    minute,
    0,
    0
  );
}

// Weekly: daysOfWeek 0..6 (JS: domingo=0)
function nextWeeklyDate(daysOfWeek: number[], hour: number, minute: number) {
  const now = new Date();
  const start = startOfTodayLocal();

  const normalized = Array.from(new Set(daysOfWeek))
    .map((d) => Math.trunc(d))
    .filter((d) => d >= 0 && d <= 6)
    .sort((a, b) => a - b);

  const candidates = normalized.length ? normalized : [now.getDay()];

  for (let i = 0; i < 14; i++) {
    const day = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i
    );
    const dow = day.getDay();
    if (!candidates.includes(dow)) continue;

    const dt = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      hour,
      minute,
      0,
      0
    );

    if (dt.getTime() > now.getTime()) return dt;
  }

  return nextDailyDateAt(hour, minute);
}

// Monthly: daysOfMonth 1..31
function nextMonthlyDate(daysOfMonth: number[], hour: number, minute: number) {
  const now = new Date();

  const normalized = Array.from(new Set(daysOfMonth))
    .map((d) => Math.trunc(d))
    .filter((d) => d >= 1 && d <= 31)
    .sort((a, b) => a - b);

  const candidates = normalized.length ? normalized : [now.getDate()];

  for (let monthOffset = 0; monthOffset < 24; monthOffset++) {
    const y = now.getFullYear();
    const m = now.getMonth() + monthOffset;

    for (const dom of candidates) {
      const dt = new Date(y, m, dom, hour, minute, 0, 0);

      const expectedMonth = ((m % 12) + 12) % 12;
      if (dt.getMonth() !== expectedMonth) continue;

      if (dt.getTime() > now.getTime()) return dt;
    }
  }

  return nextDailyDateAt(hour, minute);
}

function toContent(
  plan: HabitNotificationPlan
): Notifications.NotificationContentInput {
  return {
    title: "Tu hábito de hoy",
    body: buildHabitNotificationText(plan.icon, plan.name),
    data: { habitId: plan.habitId },
    sound: Platform.OS === "ios" ? "default" : undefined,
  };
}

export class ExpoNotificationScheduler implements NotificationScheduler {
  async scheduleForHabit(plan: HabitNotificationPlan): Promise<string[]> {
    const ids: string[] = [];

    const { hour, minute } = parseHHmm(plan.startTime);
    const offset = plan.reminderOffsetMinutes ?? 0;
    const t = applyOffset(hour, minute, offset);

    const content = toContent(plan);

    await safeCancel(habitBaseId(plan.habitId));

    // DAILY
    if (plan.schedule.type === "daily") {
      const id = habitBaseId(plan.habitId);
      await safeCancel(id);

      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content,
        trigger: {
          hour: t.hour,
          minute: t.minute,
          repeats: true,
        } as Notifications.DailyTriggerInput,
      });

      ids.push(id);
      return ids;
    }

    // WEEKLY
    if (plan.schedule.type === "weekly") {
      const days = Array.isArray(plan.schedule.daysOfWeek)
        ? plan.schedule.daysOfWeek
        : [];

      if (Platform.OS === "ios") {
        for (const dow of days) {
          const weekday = dow === 0 ? 1 : dow + 1;
          const id = `${habitBaseId(plan.habitId)}-w-${weekday}`;
          await safeCancel(id);

          await Notifications.scheduleNotificationAsync({
            identifier: id,
            content,
            trigger: {
              weekday,
              hour: t.hour,
              minute: t.minute,
              repeats: true,
            } as any,
          });

          ids.push(id);
        }
        return ids;
      }

      // Android one-shot
      const id = `${habitBaseId(plan.habitId)}-w-next`;
      await safeCancel(id);

      const next = nextWeeklyDate(days, t.hour, t.minute);

      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content,
        trigger: next as any,
      });

      ids.push(id);
      return ids;
    }

    // MONTHLY
    const doms = Array.isArray(plan.schedule.daysOfMonth)
      ? plan.schedule.daysOfMonth
      : [];

    if (Platform.OS === "ios") {
      for (const dom of doms) {
        const safeDom = Math.max(1, Math.min(31, Number(dom) || 1));
        const id = `${habitBaseId(plan.habitId)}-m-${safeDom}`;
        await safeCancel(id);

        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content,
          trigger: {
            day: safeDom,
            hour: t.hour,
            minute: t.minute,
            repeats: true,
          } as any,
        });

        ids.push(id);
      }
      return ids;
    }

    // Android one-shot
    const id = `${habitBaseId(plan.habitId)}-m-next`;
    await safeCancel(id);

    const numericDays = doms
      .map((d) => Number(d))
      .filter((d) => Number.isFinite(d)) as number[];

    const next = nextMonthlyDate(numericDays, t.hour, t.minute);

    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content,
      trigger: next as any,
    });

    ids.push(id);
    return ids;
  }

  async cancel(notificationIds: string[]): Promise<void> {
    const ids = Array.isArray(notificationIds) ? notificationIds : [];
    await Promise.all(ids.map((id) => safeCancel(id)));
  }

  /**
   * ✅ Re-agenda “próximo” recordatorio para weekly/monthly SOLO en Android.
   * Esto evita que se pierda el schedule repetitivo (Android no soporta calendar repeats).
   *
   * Llamar al abrir Home / al enfocar.
   */
  async rescheduleNextForAndroid(habits: Habit[]): Promise<void> {
    if (Platform.OS !== "android") return;

    // Evita trabajo innecesario
    if (!Array.isArray(habits) || habits.length === 0) return;

    for (const h of habits) {
      const scheduleType = h?.schedule?.type;

      if (scheduleType !== "weekly" && scheduleType !== "monthly") continue;

      const startTime = (h.startTime ?? h.time ?? "08:00") as string;
      const { hour, minute } = parseHHmm(startTime);
      const offset = Number.isFinite(h.reminderOffsetMinutes as number)
        ? (h.reminderOffsetMinutes as number)
        : 0;

      const t = applyOffset(hour, minute, offset);

      const plan: HabitNotificationPlan = {
        habitId: h.id,
        name: h.name,
        icon: h.icon,
        startTime: startTime,
        schedule: h.schedule as any,
        reminderOffsetMinutes: offset,
      };

      const content = toContent(plan);

      if (scheduleType === "weekly") {
        const days = Array.isArray((h.schedule as any)?.daysOfWeek)
          ? ((h.schedule as any).daysOfWeek as number[])
          : [];

        const id = `${habitBaseId(h.id)}-w-next`;
        await safeCancel(id);

        const next = nextWeeklyDate(days, t.hour, t.minute);

        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content,
          trigger: next as any,
        });

        continue;
      }

      if (scheduleType === "monthly") {
        const doms = Array.isArray((h.schedule as any)?.daysOfMonth)
          ? ((h.schedule as any).daysOfMonth as number[])
          : [];

        const id = `${habitBaseId(h.id)}-m-next`;
        await safeCancel(id);

        const numericDays = doms
          .map((d) => Number(d))
          .filter((d) => Number.isFinite(d)) as number[];

        const next = nextMonthlyDate(numericDays, t.hour, t.minute);

        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content,
          trigger: next as any,
        });
      }
    }
  }
}
