// src/domain/usecases/DeleteHabit.ts

import type { HabitId } from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";
import type { NotificationScheduler } from "@/domain/services/NotificationScheduler";

export class DeleteHabit {
  constructor(
    private habitRepository: HabitRepository,
    private notificationScheduler?: NotificationScheduler
  ) {}

  async execute(id: HabitId): Promise<void> {
    // ✅ 1) Cancela por habitId (robusto, aunque no tengas notificationIds guardadas)
    if (this.notificationScheduler?.cancelByHabitId) {
      try {
        await this.notificationScheduler.cancelByHabitId(id);
      } catch (e) {
        console.warn("[DeleteHabit] cancelByHabitId failed", e);
      }
    }

    // ✅ 2) Si además tienes IDs persistidas, cancélalas igual
    const habit = await this.habitRepository.getById(id);

    if (habit?.notificationIds?.length && this.notificationScheduler?.cancel) {
      try {
        await this.notificationScheduler.cancel(habit.notificationIds);
      } catch (e) {
        console.warn("[DeleteHabit] cancel notifications failed", e);
      }
    }

    // ✅ 3) Borra el hábito
    await this.habitRepository.delete(id);
  }
}
