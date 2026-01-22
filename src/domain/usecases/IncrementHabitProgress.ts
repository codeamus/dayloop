// src/domain/usecases/IncrementHabitProgress.ts
import type { HabitId } from "@/domain/entities/Habit";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

/**
 * Incrementa el progreso de un hábito para una fecha específica.
 * 
 * Si el hábito tiene targetRepeats > 1, incrementa el contador de progreso.
 * El hábito se considera "completado" (done=true) cuando progress >= targetRepeats.
 * 
 * Si targetRepeats = 1 (comportamiento tradicional), funciona como toggle.
 */
export class IncrementHabitProgress {
  constructor(
    private habitRepository: HabitRepository,
    private habitLogRepository: HabitLogRepository
  ) {}

  async execute(params: { habitId: HabitId; date: string }): Promise<void> {
    const { habitId, date } = params;

    const habit = await this.habitRepository.getById(habitId);
    if (!habit) {
      throw new Error(`Habit with id ${habitId} does not exist`);
    }

    const targetRepeats = habit.targetRepeats ?? 1;

    // Incrementar progreso
    await this.habitLogRepository.incrementProgress(
      habitId,
      date,
      targetRepeats
    );
  }
}
