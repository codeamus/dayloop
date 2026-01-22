// src/domain/usecases/UpdateHabit.ts
import type { Habit } from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";
import type {
  HabitNotificationPlan,
  NotificationScheduler,
} from "@/domain/services/NotificationScheduler";

export class UpdateHabit {
  constructor(
    private habitRepository: HabitRepository,
    private notificationScheduler: NotificationScheduler
  ) {}

  async execute(habit: Habit): Promise<void> {
    // 1) Guardar el hábito
    await this.habitRepository.update(habit);

    // 2) Cancelar notifs previas
    if (habit.notificationIds?.length) {
      await this.notificationScheduler.cancel(habit.notificationIds);
    }

    // 3) Si no hay recordatorio -> limpiar ids y listo
    // Verificar tanto reminderTimes como reminderOffsetMinutes para compatibilidad
    const hasReminderTimes =
      Array.isArray(habit.reminderTimes) && habit.reminderTimes.length > 0;
    const hasReminderOffset =
      habit.reminderOffsetMinutes !== null &&
      habit.reminderOffsetMinutes !== undefined;

    if (!hasReminderTimes && !hasReminderOffset) {
      await this.habitRepository.updateNotifications(habit.id, []);
      return;
    }

    // 4) Agendar nuevas (respetando daily/weekly/monthly)
    const plan: HabitNotificationPlan = {
      habitId: habit.id,
      name: habit.name,
      icon: habit.icon,
      startTime: habit.startTime,
      schedule: habit.schedule as any,
      reminderOffsetMinutes: habit.reminderOffsetMinutes ?? 0,
      reminderTimes: habit.reminderTimes,
    };

    const ids = await this.notificationScheduler.scheduleForHabit(plan, {
      horizonDays: 30,
    });

    await this.habitRepository.updateNotifications(habit.id, ids);
  }
}
