// src/domain/usecases/DeleteHabit.ts
import type { HabitId } from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

export class DeleteHabit {
  constructor(private habitRepository: HabitRepository) {}

  async execute(id: HabitId): Promise<void> {
    await this.habitRepository.delete(id);
  }
}
