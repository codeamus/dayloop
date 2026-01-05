import type {
     HabitNotificationPlan,
     NotificationScheduler,
} from "@/domain/services/NotificationScheduler";
import * as Notifications from "expo-notifications";

function parseHHmm(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return {
    hour: Number.isFinite(h) ? h : 8,
    minute: Number.isFinite(m) ? m : 0,
  };
}

function applyOffset(hour: number, minute: number, offsetMin: number) {
  const total = hour * 60 + minute + offsetMin;
  let h = Math.floor(total / 60) % 24;
  let m = total % 60;
  if (m < 0) m += 60;
  if (h < 0) h += 24;
  return { hour: h, minute: m };
}

export class ExpoNotificationScheduler implements NotificationScheduler {
  async scheduleForHabit(plan: HabitNotificationPlan): Promise<string[]> {
    const ids: string[] = [];

    const { hour, minute } = parseHHmm(plan.startTime);
    const offset = plan.reminderOffsetMinutes ?? 0;
    const t = applyOffset(hour, minute, offset);

    const content: Notifications.NotificationContentInput = {
      title: "Dayloop",
      body: `${plan.icon} ${plan.name}`,
      data: { habitId: plan.habitId },
    };

    if (plan.schedule.type === "daily") {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: { hour: t.hour, minute: t.minute, repeats: true },
      });
      ids.push(id);
      return ids;
    }

    if (plan.schedule.type === "weekly") {
      for (const dow of plan.schedule.daysOfWeek) {
        // expo weekday: 1..7 (Sun=1)
        const weekday = dow === 0 ? 1 : dow + 1;
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: { weekday, hour: t.hour, minute: t.minute, repeats: true },
        });
        ids.push(id);
      }
      return ids;
    }

    // Monthly: Expo no tiene trigger universal dayOfMonth.
    // Si hoy "te funciona", probablemente ya lo resolviste con otro mecanismo.
    // Para no romper tu MVP, aquí dejamos un fallback diario (NO ideal).
    // ✅ Si me pegas tu scheduler actual mensual, lo adaptamos bien.
    for (const _day of plan.schedule.daysOfMonth) {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: { hour: t.hour, minute: t.minute, repeats: true } as any,
      });
      ids.push(id);
    }

    return ids;
  }

  async cancel(notificationIds: string[]): Promise<void> {
    await Promise.all(
      (notificationIds ?? []).map((id) =>
        Notifications.cancelScheduledNotificationAsync(id)
      )
    );
  }
}
