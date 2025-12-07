// src/domain/usecases/ToggleHabitForToday.ts
import type { HabitId } from "@/domain/entities/Habit";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

export class ToggleHabitForToday {
  constructor(
    private habitRepository: HabitRepository,
    private habitLogRepository: HabitLogRepository
  ) {}

  async execute(habitId: HabitId, date: string): Promise<void> {
    // Validate existence (honestamente, te salva de datos corruptos)
    const habit = await this.habitRepository.getById(habitId);
    if (!habit) {
      throw new Error(`Habit with id ${habitId} does not exist`);
    }

    // Toggle
    await this.habitLogRepository.toggle(habitId, date);
  }
}
