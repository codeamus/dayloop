// src/core/settings/premiumUpsellSettings.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "dayloop.hasSeen3DayStreakUpsell";

// Cache en memoria para evitar lecturas repetidas
let cached: boolean | null = null;

// Mini event emitter para avisar cambios en runtime
const listeners = new Set<(value: boolean) => void>();

export function subscribeHasSeen3DayStreakUpsell(
  listener: (value: boolean) => void
) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(value: boolean) {
  for (const l of listeners) l(value);
}

export async function getHasSeen3DayStreakUpsell(): Promise<boolean> {
  if (cached !== null) return cached;

  try {
    const v = await AsyncStorage.getItem(KEY);
    cached = v === "1";
    return cached;
  } catch {
    cached = false;
    return false;
  }
}

export async function setHasSeen3DayStreakUpsell(value: boolean): Promise<void> {
  try {
    cached = value; // ✅ actualiza cache primero (instantáneo)
    notify(value); // ✅ avisa a la UI antes incluso del storage
    await AsyncStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    // si AsyncStorage falla, al menos cache + UI ya quedó ok
  }
}
