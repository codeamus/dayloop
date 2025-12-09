// utils/timeOfDay.ts
export type TimeOfDay = "morning" | "afternoon" | "evening";

export function getTimeOfDayFromHour(time24: string): TimeOfDay {
  // time24 = "HH:mm"
  const [hStr] = time24.split(":");
  const hour = Number(hStr);

  if (hour >= 5 && hour < 12) {
    return "morning";
  }

  if (hour >= 12 && hour < 18) {
    return "afternoon";
  }

  // 18:00–23:59 y 00:00–04:59
  return "evening";
}
