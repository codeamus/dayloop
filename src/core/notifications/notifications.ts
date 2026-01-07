// src/core/notifications/notifications.ts
import { HabitId } from "@/domain/entities/Habit";
import Constants from "expo-constants";
import type * as NotificationsType from "expo-notifications";
import { Platform } from "react-native";

// Expo Go Android: limitaciones (y en general Expo Go)
const isExpoGo =
  (Platform.OS === "android" || Platform.OS === "ios") &&
  Constants.appOwnership === "expo";

// Instancia real (solo fuera de Expo Go)
let Notifications: typeof NotificationsType | null = null;

if (!isExpoGo) {
  Notifications = require("expo-notifications");
}

function getNotifsOrNull() {
  return Notifications;
}

// IDs estables
const DAILY_ID = "daily-summary";

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
        // foreground only
        shouldPlaySound: false,
        shouldSetBadge: false,

        // SDK reciente
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    // en caso de compatibilidad de versión, no queremos romper la app
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

    // Solo pedimos si no está granted
    const req = await Notifs.requestPermissionsAsync();
    return req.status === "granted";
  } catch (e) {
    console.warn("[notifications] request permission failed:", e);
    return false;
  }
}

// ==========================
// Cancelación (por ID)
// ==========================
export async function cancelScheduledNotification(id: string) {
  if (isExpoGo) return;

  const Notifs = getNotifsOrNull();
  if (!Notifs) return;

  try {
    await Notifs.cancelScheduledNotificationAsync(id);
  } catch {
    // si no existía, da lo mismo
  }
}

export async function cancelDailyReminder() {
  await cancelScheduledNotification(DAILY_ID);
}

// ==========================
// Recordatorio diario (resumen)
// ==========================
export async function scheduleDailyReminder(hour: number, minute: number) {
  if (isExpoGo) return;

  const Notifs = getNotifsOrNull();
  if (!Notifs) return;

  const ok = await requestNotificationPermission();
  if (!ok) return;

  await cancelScheduledNotification(DAILY_ID);

  const trigger: NotificationsType.NotificationTriggerInput = {
    type: Notifs.SchedulableTriggerInputTypes.CALENDAR,
    hour,
    minute,
    repeats: true,
  };

  await Notifs.scheduleNotificationAsync({
    identifier: DAILY_ID,
    content: {
      title: "DAYLOOP",
      body: "No olvides completar tus hábitos de hoy 💡",
      sound: Platform.OS === "ios" ? "default" : undefined,
    },
    trigger,
  });
}

// ==========================
// ❌ DEPRECATED: Recordatorio por hábito
// ==========================
export async function scheduleHabitReminder(_options: {
  habitId: HabitId;
  habitName: string;
  hour: number;
  minute: number;
  offsetMinutes?: number;
}) {
  // intentionally no-op
  console.warn(
    "[notifications] scheduleHabitReminder() deprecated (no-op). Use NotificationScheduler."
  );
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
