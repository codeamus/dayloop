// src/core/notifications/notifications.ts
import Constants from "expo-constants";
import type * as NotificationsType from "expo-notifications";
import { Platform } from "react-native";

// Detectar Expo Go en Android (no soporta bien expo-notifications)
const isExpoGoAndroid =
  Platform.OS === "android" && Constants.appOwnership === "expo";

// Instancia real (solo se llena fuera de Expo Go Android)
let Notifications: typeof NotificationsType | null = null;

if (!isExpoGoAndroid) {
   
  Notifications = require("expo-notifications");
}

// Helper interno para evitar repetir null-check
function assertNotifications() {
  if (!Notifications) {
    throw new Error(
      "[notifications] expo-notifications no está disponible en este entorno (probablemente Expo Go en Android)."
    );
  }
  return Notifications;
}

// ==========================
// API pública
// ==========================

// Config global: cómo se muestran las notis cuando la app está abierta
export function initNotificationsConfig() {
  if (isExpoGoAndroid) {
    console.log(
      "[notifications] Saltando configuración en Expo Go Android (no soporta push remotas)"
    );
    return;
  }

  const Notifs = assertNotifications();

  Notifs.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGoAndroid) {
    console.log(
      "[notifications] Saltando requestPermission en Expo Go Android."
    );
    return false;
  }

  const Notifs = assertNotifications();

  const { status: existingStatus } = await Notifs.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifs.requestPermissionsAsync();
  return status === "granted";
}

// Cancela todas las notis programadas (para evitar duplicados)
export async function cancelAllScheduledNotifications() {
  if (isExpoGoAndroid) return;
  const Notifs = assertNotifications();
  await Notifs.cancelAllScheduledNotificationsAsync();
}

// Programa un recordatorio diario a la hora/minuto que le pases
export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<void> {
  if (isExpoGoAndroid) {
    console.log(
      "[notifications] No se programan recordatorios en Expo Go Android."
    );
    return;
  }

  const Notifs = assertNotifications();

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn("Notificaciones no permitidas por el usuario");
    return;
  }

  // Evitar acumular notis duplicadas
  await cancelAllScheduledNotifications();

  const trigger: NotificationsType.DailyTriggerInput = {
    hour,
    minute,
    repeats: true,
  };

  await Notifs.scheduleNotificationAsync({
    content: {
      title: "DAYLOOP",
      body: "No olvides completar tus hábitos de hoy 💡",
      sound: Platform.OS === "ios" ? "default" : undefined,
    },
    trigger,
  });

  console.log(
    `[notifications] Programado recordatorio diario a las ${hour}:${String(
      minute
    ).padStart(2, "0")}`
  );
}
