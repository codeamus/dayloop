// src/core/notifications/notifications.ts
import { HabitId } from "@/domain/entities/Habit";
import Constants from "expo-constants";
import type * as NotificationsType from "expo-notifications";
import { Platform } from "react-native";

// ✅ AsyncStorage para persistir el notificationId por hábito
import AsyncStorage from "@react-native-async-storage/async-storage";

// Expo Go Android/iOS: limitaciones (y en general Expo Go)
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

// Storage keys (por hábito)
const habitKey = (habitId: HabitId) => `dayloop:notif:habit:${habitId}`;

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
// ✅ Recordatorios por hábito (upsert/cancel)
// ==========================
async function getHabitNotificationId(
  habitId: HabitId
): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(habitKey(habitId));
    return v || null;
  } catch {
    return null;
  }
}

async function setHabitNotificationId(
  habitId: HabitId,
  notificationId: string | null
) {
  try {
    if (!notificationId) {
      await AsyncStorage.removeItem(habitKey(habitId));
      return;
    }
    await AsyncStorage.setItem(habitKey(habitId), notificationId);
  } catch {
    // noop
  }
}

/**
 * Cancela el recordatorio actual de un hábito (si existe)
 */
export async function cancelHabitReminder(habitId: HabitId) {
  if (isExpoGo) return;

  const Notifs = getNotifsOrNull();
  if (!Notifs) return;

  const existing = await getHabitNotificationId(habitId);
  if (!existing) return;

  try {
    await Notifs.cancelScheduledNotificationAsync(existing);
  } catch {
    // si no existía, da lo mismo
  } finally {
    await setHabitNotificationId(habitId, null);
  }
}

/**
 * Programa/actualiza un recordatorio por hábito.
 * - offsetMinutes: minutos ANTES de la hora de inicio (0 = justo a la hora)
 * - null no se maneja aquí: si quieres "sin recordatorio" llama cancelHabitReminder()
 */
export async function scheduleHabitReminder(options: {
  habitId: HabitId;
  habitName: string;
  hour: number;
  minute: number;
  offsetMinutes?: number; // default 0
}) {
  if (isExpoGo) return;

  const Notifs = getNotifsOrNull();
  if (!Notifs) return;

  const ok = await requestNotificationPermission();
  if (!ok) return;

  const offset = Math.max(0, options.offsetMinutes ?? 0);

  // ✅ Upsert: cancela el anterior primero
  await cancelHabitReminder(options.habitId);

  // Calcular hora/minuto con offset "antes"
  const total = options.hour * 60 + options.minute - offset;
  const safe = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(safe / 60);
  const m = safe % 60;

  const trigger: NotificationsType.NotificationTriggerInput = {
    type: Notifs.SchedulableTriggerInputTypes.CALENDAR,
    hour: h,
    minute: m,
    repeats: true,
  };

  // IMPORTANTE: NO usamos identifier = habitId porque ese identifier NO sirve
  // para cancelar por identifier; expo te devuelve un id real.
  const notificationId = await Notifs.scheduleNotificationAsync({
    content: {
      title: options.habitName,
      body:
        offset > 0
          ? `En ${offset} min comienza tu hábito`
          : "Es hora de tu hábito",
      sound: Platform.OS === "ios" ? "default" : undefined,
    },
    trigger,
  });

  // Guardar id real para poder cancelarlo después
  await setHabitNotificationId(options.habitId, notificationId);

  return notificationId;
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
