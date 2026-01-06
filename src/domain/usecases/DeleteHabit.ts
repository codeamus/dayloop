// src/domain/usecases/DeleteHabit.ts
import type { HabitId } from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";
import type { NotificationScheduler } from "@/domain/services/NotificationScheduler";

export class DeleteHabit {
  constructor(
    private habitRepository: HabitRepository,
    private notificationScheduler?: NotificationScheduler // ✅ optional
  ) {}

  async execute(id: HabitId): Promise<void> {
    const habit = await this.habitRepository.getById(id);

    // ✅ cancel notifs si existe scheduler
    if (habit?.notificationIds?.length && this.notificationScheduler?.cancel) {
      try {
        await this.notificationScheduler.cancel(habit.notificationIds);
      } catch (e) {
        console.warn("[DeleteHabit] cancel notifications failed", e);
      }
    }

    await this.habitRepository.delete(id);
  }
}
