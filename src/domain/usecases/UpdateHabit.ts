// src/domain/usecases/UpdateHabit.ts
import type { Habit } from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

export class UpdateHabit {
  constructor(private habitRepository: HabitRepository) {}

  async execute(habit: Habit): Promise<void> {
    await this.habitRepository.update(habit);
  }
}
