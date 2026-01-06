// src/core/notifications/notifications.ts
import { HabitId } from "@/domain/entities/Habit";
import Constants from "expo-constants";
import type * as NotificationsType from "expo-notifications";
import { Platform } from "react-native";

// Expo Go Android: limitaciones
const isExpoGoAndroid =
  Platform.OS === "android" && Constants.appOwnership === "expo";

// Instancia real
let Notifications: typeof NotificationsType | null = null;

if (!isExpoGoAndroid) {
  Notifications = require("expo-notifications");
}

function assertNotifications() {
  if (!Notifications) {
    throw new Error(
      "[notifications] expo-notifications no está disponible en este entorno (probablemente Expo Go en Android)."
    );
  }
  return Notifications;
}

// IDs estables
const DAILY_ID = "daily-summary";

// ==========================
// Config global
// ==========================
export function initNotificationsConfig() {
  if (isExpoGoAndroid) return;

  const Notifs = assertNotifications();

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
}

// ==========================
// Permisos
// ==========================
export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGoAndroid) return false;

  const Notifs = assertNotifications();

  const perms = await Notifs.getPermissionsAsync();
  if (perms.status === "granted") return true;

  const req = await Notifs.requestPermissionsAsync();
  return req.status === "granted";
}

// ==========================
// Cancelación (por ID)
// ==========================
export async function cancelScheduledNotification(id: string) {
  if (isExpoGoAndroid) return;
  const Notifs = assertNotifications();
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
  if (isExpoGoAndroid) return;

  const Notifs = assertNotifications();
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
//
// Antes programaba recordatorios por hábito aquí, pero ahora eso lo hace
// el NotificationScheduler (ExpoNotificationScheduler) y esto generaba duplicados.
//
// Si todavía hay un llamado perdido en el código a esta función, NO queremos
// que programe nada.
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
  if (isExpoGoAndroid) return;

  const Notifs = assertNotifications();
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
