// src/core/notifications/notifications.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Config global: cómo se muestran las notis cuando la app está abierta
export function initNotificationsConfig() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// Cancela todas las notis programadas (para evitar duplicados)
export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Programa un recordatorio diario a la hora/minuto que le pases
export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn("Notificaciones no permitidas por el usuario");
    return;
  }

  // Evitar acumular notis duplicadas
  await cancelAllScheduledNotifications();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "DAYLOOP",
      body: "No olvides completar tus hábitos de hoy 💡",
      sound: Platform.OS === "ios" ? "default" : undefined,
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    },
  });

  console.log(
    `[notifications] Programado recordatorio diario a las ${hour}:${String(
      minute
    ).padStart(2, "0")}`
  );
}
