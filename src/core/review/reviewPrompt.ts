// src/core/review/reviewPrompt.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_INSTALLED_AT = "review.installedAt";
const KEY_LAST_PROMPT_AT = "review.lastPromptAt";
const KEY_DISABLED = "review.disabled"; // user said "no" or already reviewed

const DAYS_TO_FIRST_PROMPT = 7;
const DAYS_BETWEEN_PROMPTS = 30;

function daysBetween(a: number, b: number) {
  const diff = Math.abs(a - b);
  return diff / (1000 * 60 * 60 * 24);
}

export async function initReviewTracking() {
  const installedAt = await AsyncStorage.getItem(KEY_INSTALLED_AT);
  if (!installedAt) {
    await AsyncStorage.setItem(KEY_INSTALLED_AT, String(Date.now()));
  }
}

export async function disableReviewPrompts() {
  await AsyncStorage.setItem(KEY_DISABLED, "1");
}

export async function canShowReviewPromptNow(): Promise<boolean> {
  const disabled = await AsyncStorage.getItem(KEY_DISABLED);
  if (disabled === "1") return false;

  const now = Date.now();

  const installedAtStr = await AsyncStorage.getItem(KEY_INSTALLED_AT);
  const installedAt = installedAtStr ? Number(installedAtStr) : now;

  // si por alguna razón no existía, lo setea
  if (!installedAtStr) {
    await AsyncStorage.setItem(KEY_INSTALLED_AT, String(installedAt));
    return false;
  }

  if (daysBetween(now, installedAt) < DAYS_TO_FIRST_PROMPT) return false;

  const lastPromptAtStr = await AsyncStorage.getItem(KEY_LAST_PROMPT_AT);
  if (!lastPromptAtStr) return true;

  const lastPromptAt = Number(lastPromptAtStr);
  return daysBetween(now, lastPromptAt) >= DAYS_BETWEEN_PROMPTS;
}

export async function markReviewPromptShownNow() {
  await AsyncStorage.setItem(KEY_LAST_PROMPT_AT, String(Date.now()));
}
