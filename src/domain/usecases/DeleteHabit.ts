// src/domain/usecases/DeleteHabit.ts
import type { HabitId } from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";
import type { NotificationScheduler } from "@/domain/services/NotificationScheduler";

export class DeleteHabit {
  constructor(
    private habitRepository: HabitRepository,
    private notificationScheduler: NotificationScheduler
  ) {}

  async execute(id: HabitId): Promise<void> {
    const habit = await this.habitRepository.getById(id);

    if (habit?.notificationIds?.length) {
      await this.notificationScheduler.cancel(habit.notificationIds);
    }

    await this.habitRepository.delete(id);
  }
}
