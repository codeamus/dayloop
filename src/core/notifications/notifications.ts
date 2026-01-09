// src/core/notifications/notifications.ts
import type { Habit } from "@/domain/entities/Habit";
import type { HabitNotificationPlan } from "@/domain/services/NotificationScheduler";
import Constants from "expo-constants";
import type * as NotificationsType from "expo-notifications";
import { Platform } from "react-native";

import { container } from "@/core/di/container";

// Expo Go Android/iOS: limitaciones
const isExpoGo =
  (Platform.OS === "android" || Platform.OS === "ios") &&
  Constants.appOwnership === "expo";

let Notifications: typeof NotificationsType | null = null;

if (!isExpoGo) {
  Notifications = require("expo-notifications");
}

function getNotifsOrNull() {
  return Notifications;
}

// ==========================
// Config global (idempotente)
// ==========================
let didInitConfig = false;

export function initNotificationsConfig() {
  if (isExpoGo) return;
  if (didInitConfig) return;

  const Notifs = getNotifsOrNull();
  if (!Notifs) return;

  didInitConfig = true;

  try {
    Notifs.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn("[notifications] setNotificationHandler failed:", e);
  }
}

// ==========================
// Permisos
// ==========================
export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGo) return false;

  const Notifs = getNotifsOrNull();
  if (!Notifs) return false;

  try {
    const perms = await Notifs.getPermissionsAsync();
    if (perms.status === "granted") return true;

    const req = await Notifs.requestPermissionsAsync();
    return req.status === "granted";
  } catch (e) {
    console.warn("[notifications] request permission failed:", e);
    return false;
  }
}

// ==========================
// ✅ Hábito: cancel robusto por habitId
// ==========================
export async function cancelHabitNotificationsByHabitId(habitId: string) {
  if (isExpoGo) return;

  const ok = await requestNotificationPermission();
  if (!ok) return;

  // ✅ cancela lo que exista (aunque no tengamos IDs guardadas)
  await container.notificationScheduler.cancelByHabitId(habitId);

  // ✅ además si tenemos IDs guardadas en DB, cancélalas igual (doble seguro)
  const habit = await container.habitRepository.getById(habitId);
  if (habit?.notificationIds?.length) {
    await container.notificationScheduler.cancel(habit.notificationIds);
    await container.habitRepository.updateNotifications(habitId, []);
  }
}

// ==========================
// ✅ Hábito: re-agendar respetando schedule weekly/monthly
// ==========================
export async function rescheduleHabitNotificationsForHabit(
  habit: Habit,
  options?: { horizonDays?: number }
) {
  if (isExpoGo) return;

  const ok = await requestNotificationPermission();
  if (!ok) return;

  // 1) cancelar TODO lo anterior por habitId (esto mata el duplicado real)
  await container.notificationScheduler.cancelByHabitId(habit.id);

  // 2) si además hay ids guardados, cancelarlos también
  if (habit.notificationIds?.length) {
    await container.notificationScheduler.cancel(habit.notificationIds);
  }

  // 3) si no hay recordatorio, dejar limpio
  if (habit.reminderOffsetMinutes === null) {
    await container.habitRepository.updateNotifications(habit.id, []);
    return;
  }

  const plan: HabitNotificationPlan = {
    habitId: habit.id,
    name: habit.name,
    icon: habit.icon,
    startTime: habit.startTime ?? habit.time ?? "08:00",
    schedule: habit.schedule as any,
    reminderOffsetMinutes: habit.reminderOffsetMinutes ?? 0,
  };

  const ids = await container.notificationScheduler.scheduleForHabit(plan, {
    horizonDays: options?.horizonDays ?? 30,
  });

  // 4) persistir ids nuevos
  await container.habitRepository.updateNotifications(habit.id, ids);
}

// ==========================
// Debug: notificación en X segundos
// ==========================
export async function scheduleDebugNotificationIn(seconds: number) {
  if (isExpoGo) return;

  const Notifs = getNotifsOrNull();
  if (!Notifs) return;

  const ok = await requestNotificationPermission();
  if (!ok) return;

  const debugId = `debug-${Date.now()}`;

  const trigger: NotificationsType.NotificationTriggerInput = {
    type: Notifs.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds,
    repeats: false,
  };

  await Notifs.scheduleNotificationAsync({
    identifier: debugId,
    content: {
      title: "DEBUG DAYLOOP",
      body: `Esta es una notificación de prueba (${seconds}s)`,
      sound: Platform.OS === "ios" ? "default" : undefined,
    },
    trigger,
  });
}
