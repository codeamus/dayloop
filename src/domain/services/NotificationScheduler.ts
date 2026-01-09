// src/domain/services/NotificationScheduler.ts

export type HabitNotificationPlan = {
  habitId: string;
  name: string;
  icon: string;
  startTime: string; // "HH:mm"
  schedule:
    | { type: "daily" }
    | { type: "weekly"; daysOfWeek: number[] } // 0..6 (Dom=0)
    | { type: "monthly"; daysOfMonth: number[] }; // 1..31
  reminderOffsetMinutes: number | null;
};

export interface NotificationScheduler {
  scheduleForHabit(
    plan: HabitNotificationPlan,
    options?: { horizonDays?: number }
  ): Promise<string[]>;

  cancel(notificationIds: string[]): Promise<void>;

  // ✅ clave: cancelar por habitId mirando el sistema
  cancelByHabitId(habitId: string): Promise<void>;
}
