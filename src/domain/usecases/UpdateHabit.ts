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
    // 1) Cancelar notificaciones anteriores
    if (habit.notificationIds?.length) {
      await this.notificationScheduler.cancel(habit.notificationIds);
    }

    // 2) Re-agendar
    const plan: HabitNotificationPlan = {
      habitId: habit.id,
      name: habit.name,
      icon: habit.icon,
      startTime: habit.startTime,
      schedule: habit.schedule as any,
      reminderOffsetMinutes: habit.reminderOffsetMinutes ?? null,
    };

    const ids = await this.notificationScheduler.scheduleForHabit(plan);

    // 3) Persistir
    habit.notificationIds = ids;
    await this.habitRepository.updateNotifications(habit.id, ids);

    // 4) Guardar hábito actualizado
    await this.habitRepository.update(habit);
  }
}
