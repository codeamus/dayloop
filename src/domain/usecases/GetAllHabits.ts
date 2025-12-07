import type { Habit } from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

export class GetAllHabits {
  constructor(private habitRepository: HabitRepository) {}

  async execute(): Promise<Habit[]> {
    return this.habitRepository.getAll();
  }
}
