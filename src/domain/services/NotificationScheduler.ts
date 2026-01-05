export type HabitNotificationPlan = {
  habitId: string;
  name: string;
  icon: string;
  startTime: string; // "HH:mm"
  schedule:
    | { type: "daily" }
    | { type: "weekly"; daysOfWeek: number[] }
    | { type: "monthly"; daysOfMonth: number[] };
  reminderOffsetMinutes: number | null;
};

export interface NotificationScheduler {
  scheduleForHabit(plan: HabitNotificationPlan): Promise<string[]>; // returns IDs
  cancel(notificationIds: string[]): Promise<void>;
}
