// src/infraestructure/notifications/ExpoNotificationScheduler.ts

import type {
  HabitNotificationPlan,
  NotificationScheduler,
} from "@/domain/services/NotificationScheduler";
import * as Notifications from "expo-notifications";

/**
 * Helpers fechas (local) + parsing hora "HH:mm"
 */
function parseHM(hm: string): { hour: number; minute: number } {
  const [h, m] = (hm ?? "").split(":").map((v) => Number(v));
  return {
    hour: Number.isFinite(h) ? h : 9,
    minute: Number.isFinite(m) ? m : 0,
  };
}

/**
 * Aplica offset en minutos a una hora HH:mm.
 * Devuelve {hour, minute} ya normalizado (0..23 / 0..59).
 */
function applyOffsetToHM(
  hm: string,
  offsetMinutes: number | null
): { hour: number; minute: number } {
  const { hour, minute } = parseHM(hm);
  const base = hour * 60 + minute;
  const off = Number.isFinite(offsetMinutes as number)
    ? (offsetMinutes as number)
    : 0;

  let total = base - off;
  // normaliza en rango 0..1439
  total = ((total % 1440) + 1440) % 1440;

  return { hour: Math.floor(total / 60), minute: total % 60 };
}

export class ExpoNotificationScheduler implements NotificationScheduler {
  /**
   * Programa notificaciones recurrentes según el plan.
   * IMPORTANTÍSIMO: siempre agrega data.habitId para poder cancelar por hábito.
   */
  async scheduleForHabit(plan: HabitNotificationPlan): Promise<string[]> {
    const ids: string[] = [];

    const time = applyOffsetToHM(plan.startTime, plan.reminderOffsetMinutes);

    // Contenido base
    const content: Notifications.NotificationContentInput = {
      title: plan.name,
      body: "Recordatorio de hábito",
      sound: true,
      data: { habitId: plan.habitId }, // ✅ CLAVE
    };

    if (plan.schedule.type === "daily") {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          hour: time.hour,
          minute: time.minute,
          repeats: true,
        } as Notifications.DailyTriggerInput,
      });
      ids.push(id);
      return ids;
    }

    if (plan.schedule.type === "weekly") {
      const days = Array.isArray(plan.schedule.daysOfWeek)
        ? plan.schedule.daysOfWeek
        : [];

      // expo usa weekday 1-7 (1=Sunday ... 7=Saturday)
      // tu dominio usa 0-6 (0=Domingo ... 6=Sábado)
      const toExpoWeekday = (d0to6: number) => {
        const d = Number(d0to6);
        if (!Number.isFinite(d)) return 1;
        return d === 0 ? 1 : d + 1;
      };

      const unique = Array.from(new Set(days)).filter((d) => d >= 0 && d <= 6);

      for (const d of unique) {
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            weekday: toExpoWeekday(d),
            hour: time.hour,
            minute: time.minute,
            repeats: true,
          } as Notifications.WeeklyTriggerInput,
        });
        ids.push(id);
      }

      return ids;
    }

    if (plan.schedule.type === "monthly") {
      const days = Array.isArray(plan.schedule.daysOfMonth)
        ? plan.schedule.daysOfMonth
        : [];

      const unique = Array.from(new Set(days)).filter((d) => d >= 1 && d <= 31);

      for (const day of unique) {
        const id = await Notifications.scheduleNotificationAsync({
          content,
          // MonthlyTriggerInput (day: 1-31)
          trigger: {
            day,
            hour: time.hour,
            minute: time.minute,
            repeats: true,
          } as any,
        });

        ids.push(id);
      }

      return ids;
    }

    return ids;
  }

  async cancel(notificationIds: string[]): Promise<void> {
    const ids = Array.isArray(notificationIds) ? notificationIds : [];
    await Promise.all(
      ids.map((id) => Notifications.cancelScheduledNotificationAsync(id))
    );
  }

  /**
   * ✅ Robusto: cancela todas las notificaciones programadas cuyo data.habitId === habitId
   */
  async cancelByHabitId(habitId: string): Promise<void> {
    const all = await Notifications.getAllScheduledNotificationsAsync();

    const toCancel = all
      .filter((n) => (n?.content?.data as any)?.habitId === habitId)
      .map((n) => n.identifier);

    if (!toCancel.length) return;

    await Promise.all(
      toCancel.map((id) => Notifications.cancelScheduledNotificationAsync(id))
    );
  }
}
