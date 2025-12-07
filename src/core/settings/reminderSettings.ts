// src/core/settings/reminderSettings.ts
import {
     cancelAllScheduledNotifications,
     scheduleDailyReminder,
} from "@/core/notifications/notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "dayloop:reminder_settings";

export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 21,
  minute: 0,
};

export async function loadReminderSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as ReminderSettings;

    if (
      typeof parsed.enabled === "boolean" &&
      typeof parsed.hour === "number" &&
      typeof parsed.minute === "number"
    ) {
      return parsed;
    }

    return DEFAULT_SETTINGS;
  } catch (e) {
    console.warn("[reminderSettings] error loading", e);
    return DEFAULT_SETTINGS;
  }
}

export async function saveReminderSettings(
  settings: ReminderSettings
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn("[reminderSettings] error saving", e);
  }
}

// Aplica la configuración: programa o cancela notis
export async function applyReminderSettings(
  settings: ReminderSettings
): Promise<void> {
  if (!settings.enabled) {
    await cancelAllScheduledNotifications();
    return;
  }

  await scheduleDailyReminder(settings.hour, settings.minute);
}
