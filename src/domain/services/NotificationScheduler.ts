// src/domain/services/NotificationScheduler.ts

export type HabitNotificationPlan = {
  habitId: string;
  name: string;
  icon: string;
  startTime: string; // "HH:mm" (legacy, usado si reminderTimes no existe)
  schedule:
    | { type: "daily" }
    | { type: "weekly"; daysOfWeek: number[] } // 0..6 (Dom=0)
    | { type: "monthly"; daysOfMonth: number[] }; // 1..31
  reminderOffsetMinutes: number | null; // Legacy: usado si reminderTimes no existe
  reminderTimes?: string[]; // Array de horarios "HH:mm" para múltiples recordatorios
};

export interface NotificationScheduler {
  scheduleForHabit(
    plan: HabitNotificationPlan,
    options?: { horizonDays?: number }
  ): Promise<string[]>;

  cancel(notificationIds: string[]): Promise<void>;

  // ✅ clave: cancelar por habitId mirando el sistema
  cancelByHabitId(habitId: string): Promise<void>;

  /**
   * Programa una notificación de rescate/retention que se dispara en 48 horas.
   * Usa un ID fijo para que cada vez que se programe, sobrescriba la anterior.
   * La notificación se programa a la misma hora local que cuando se invoca.
   */
  scheduleRetentionNotification(): Promise<void>;
}
