// src/infraestructure/notifications/ExpoNotificationScheduler.ts
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

export class ExpoNotificationScheduler implements NotificationScheduler {
  async scheduleForHabit(plan: HabitNotificationPlan): Promise<string[]> {
    const ids: string[] = [];

    const { hour, minute } = parseHHmm(plan.startTime);
    const offset = plan.reminderOffsetMinutes ?? 0;
    const t = applyOffset(hour, minute, offset);

    const content: Notifications.NotificationContentInput = {
      title: "Tu hábito de hoy",
      body: buildHabitNotificationText(plan.icon, plan.name),
      data: { habitId: plan.habitId },
      sound: Platform.OS === "ios" ? "default" : undefined,
    };

    // ✅ Limpia ID legacy diario (por si quedó programado por el sistema viejo)
    await safeCancel(habitBaseId(plan.habitId));

    if (plan.schedule.type === "daily") {
      const id = habitBaseId(plan.habitId);

      await safeCancel(id);

      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR, // ✅ CLAVE
          hour: t.hour,
          minute: t.minute,
          repeats: true,
        },
      });

      ids.push(id);
      return ids;
    }

    if (plan.schedule.type === "weekly") {
      const days = Array.isArray(plan.schedule.daysOfWeek)
        ? plan.schedule.daysOfWeek
        : [];

      for (const dow of days) {
        // expo weekday: 1..7 (Sun=1)
        const weekday = dow === 0 ? 1 : dow + 1;

        const id = `${habitBaseId(plan.habitId)}-w-${weekday}`;

        await safeCancel(id);

        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR, // ✅ CLAVE
            weekday,
            hour: t.hour,
            minute: t.minute,
            repeats: true,
          },
        });

        ids.push(id);
      }

      return ids;
    }

    // Monthly (MVP fallback)
    const doms = Array.isArray(plan.schedule.daysOfMonth)
      ? plan.schedule.daysOfMonth
      : [];

    for (const dom of doms) {
      const safeDom = Math.max(1, Math.min(31, Number(dom) || 1));
      const id = `${habitBaseId(plan.habitId)}-m-${safeDom}`;

      await safeCancel(id);

      // ⚠️ Expo no soporta un trigger mensual real cross-platform.
      // MVP: lo dejamos como diario (pero ya NO debe disparar instantáneamente).
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR, // ✅ CLAVE
          hour: t.hour,
          minute: t.minute,
          repeats: true,
        } as any,
      });

      ids.push(id);
    }

    return ids;
  }

  async cancel(notificationIds: string[]): Promise<void> {
    const ids = Array.isArray(notificationIds) ? notificationIds : [];
    await Promise.all(ids.map((id) => safeCancel(id)));
  }
}
