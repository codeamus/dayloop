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

/**
 * Obtiene todos los horarios de recordatorio para un plan.
 * Si reminderTimes existe, lo usa. Si no, calcula desde startTime - offset (legacy).
 */
function getReminderTimes(plan: HabitNotificationPlan): string[] {
  // Si hay reminderTimes definidos, usarlos
  if (Array.isArray(plan.reminderTimes) && plan.reminderTimes.length > 0) {
    return plan.reminderTimes.filter((t) => /^\d{2}:\d{2}$/.test(t));
  }

  // Legacy: calcular desde startTime - offset
  const { hour, minute } = computeReminderHM(plan);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return [`${hh}:${mm}`];
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
  const reminderTimes = getReminderTimes(plan);

  const out: Date[] = [];
  const base = startOfToday(now);

  const pushIfFuture = (d: Date) => {
    if (!isValidDate(d)) return;
    if (d.getTime() >= minFuture.getTime()) out.push(d);
  };

  // Para cada horario de recordatorio
  for (const timeStr of reminderTimes) {
    const { h, m } = parseHHmm(timeStr);
    const hour = h;
    const minute = m;

    if (plan.schedule.type === "daily") {
      for (let i = 0; i <= horizonDays; i++) {
        const d = addDays(base, i);
        d.setHours(hour, minute, 0, 0);
        pushIfFuture(d);
      }
    } else if (plan.schedule.type === "weekly") {
      const days = Array.isArray(plan.schedule.daysOfWeek)
        ? plan.schedule.daysOfWeek
        : [];
      const set = new Set(
        days
          .map((x) => Math.trunc(Number(x)))
          .filter((x) => Number.isFinite(x) && x >= 0 && x <= 6)
      );
      if (!set.size) continue;

      for (let i = 0; i <= horizonDays; i++) {
        const d = addDays(base, i);
        const dow = d.getDay(); // 0..6
        if (!set.has(dow)) continue;
        d.setHours(hour, minute, 0, 0);
        pushIfFuture(d);
      }
    } else if (plan.schedule.type === "monthly") {
      const days = Array.isArray(plan.schedule.daysOfMonth)
        ? plan.schedule.daysOfMonth
        : [];
      const set = new Set(
        days
          .map((x) => Math.trunc(Number(x)))
          .filter((x) => Number.isFinite(x) && x >= 1 && x <= 31)
      );
      if (!set.size) continue;

      for (let i = 0; i <= horizonDays; i++) {
        const d = addDays(base, i);
        const dom = d.getDate(); // 1..31
        if (!set.has(dom)) continue;
        d.setHours(hour, minute, 0, 0);
        pushIfFuture(d);
      }
    }
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

  async scheduleRetentionNotification(): Promise<void> {
    const RETENTION_NOTIFICATION_ID = "retention-rescue";
    
    try {
      // Cancelar la notificación anterior si existe (usando el ID fijo)
      await Notifications.cancelScheduledNotificationAsync(RETENTION_NOTIFICATION_ID);
    } catch {
      // Ignorar si no existe
    }

    // Obtener la hora actual local
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentSecond = now.getSeconds();

    // Calcular la fecha en 48 horas, manteniendo la misma hora local
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 2); // +2 días = 48 horas
    targetDate.setHours(currentHour, currentMinute, currentSecond, 0);

    // Asegurar que la fecha sea al menos 60 segundos en el futuro
    const minFuture = new Date(now.getTime() + 60 * 1000);
    if (targetDate.getTime() < minFuture.getTime()) {
      targetDate.setTime(minFuture.getTime());
    }

    // Mensajes de rescate aleatorios
    const mensajes = [
      {
        title: "¡No rompas la cadena!",
        body: "Tus hábitos te extrañan. Entra un momento y registra tu progreso de hoy.",
      },
      {
        title: "Un pequeño paso hoy...",
        body: "...es un gran salto mañana. Solo toma 10 segundos marcar tus hábitos en Dayloop.",
      },
      {
        title: "Mantén el ritmo",
        body: "La constancia es la clave del éxito. ¡Vuelve para completar tus objetivos!",
      },
      {
        title: "¿Seguimos adelante?",
        body: "No importa si ayer no pudiste, lo que cuenta es retomar hoy. ¡Tú puedes!",
      },
    ];

    // Seleccionar mensaje aleatorio
    const mensajeSeleccionado =
      mensajes[Math.floor(Math.random() * mensajes.length)];

    // Programar la notificación con ID fijo para que sobrescriba la anterior
    await Notifications.scheduleNotificationAsync({
      identifier: RETENTION_NOTIFICATION_ID,
      content: {
        title: mensajeSeleccionado.title,
        body: mensajeSeleccionado.body,
        data: { kind: "retention_rescue" },
      },
      trigger: { type: "date", date: targetDate },
    });
  }
}
