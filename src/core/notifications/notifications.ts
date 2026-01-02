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
// Recordatorio por hábito (diario)
// ==========================
export async function scheduleHabitReminder(options: {
  habitId: HabitId;
  habitName: string;
  hour: number;
  minute: number;
  offsetMinutes?: number;
}) {
  if (isExpoGoAndroid) return;

  const Notifs = assertNotifications();
  const ok = await requestNotificationPermission();
  if (!ok) return;

  const offset = options.offsetMinutes ?? 0;
  const total = options.hour * 60 + options.minute - offset;
  const minutesInDay = 24 * 60;

  const normalized = ((total % minutesInDay) + minutesInDay) % minutesInDay;
  const reminderHour = Math.floor(normalized / 60);
  const reminderMinute = normalized % 60;

  const id = `habit-${options.habitId}`;

  // Evitar duplicados solo para este hábito
  await cancelScheduledNotification(id);

  const trigger: NotificationsType.NotificationTriggerInput = {
    type: Notifs.SchedulableTriggerInputTypes.CALENDAR,
    hour: reminderHour,
    minute: reminderMinute,
    repeats: true,
  };

  await Notifs.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: "DAYLOOP",
      body: `¡${options.habitName}! Es momento de cumplir tu hábito 💪`,
      sound: Platform.OS === "ios" ? "default" : undefined,
    },
    trigger,
  });
}

// ==========================
// Debug (opcional): notificación en X segundos
// Deja esto aquí por si alguna vez necesitas testear, pero NO lo llames en producción.
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
