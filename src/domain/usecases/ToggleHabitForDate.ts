// src/domain/usecases/ToggleHabitForDate.ts
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

/**
 * Toggle de un hábito para una fecha específica (YYYY-MM-DD)
 * - Si el día estaba done => pasa a false
 * - Si estaba false/no existe => pasa a true
 *
 * Nota: esto NO valida schedule; esa validación la hace la UI (MonthlyCalendar)
 * y/o el caso de uso mensual (GetHabitMonthlyStats) al calcular states.
 */
export class ToggleHabitForDate {
  constructor(
    private habitRepository: HabitRepository,
    private habitLogRepository: HabitLogRepository
  ) {}

  async execute(params: { habitId: string; date: string }): Promise<void> {
    const { habitId, date } = params;

    // (Opcional) asegurar que el hábito existe
    const habit = await this.habitRepository.getById(habitId);
    if (!habit) return;

    // Buscamos si ese día ya tiene log
    const logs = await this.habitLogRepository.getLogsForHabit(habitId);
    const existing = logs.find((l) => l.date === date);

    const targetRepeats = habit.targetRepeats ?? 1;
    const mode = habit.mode ?? "bloque";

    // Para hábitos puntuales completados, hacer toggle (volver a pendientes)
    // Para hábitos de bloque o puntuales no completados, incrementar progreso
    if (mode === "puntual" && existing && existing.done) {
      // Toggle: volver a pendientes
      const nextDone = false;
      const nextProgress = 0;
      await this.habitLogRepository.upsertLog(
        habitId,
        date,
        nextDone,
        nextProgress
      );
    } else if (targetRepeats > 1) {
      // Incrementar progreso para hábitos con múltiples repeticiones
      await this.habitLogRepository.incrementProgress(
        habitId,
        date,
        targetRepeats
      );
    } else {
      // Toggle tradicional para hábitos simples
      const nextDone = existing ? !existing.done : true;
      const nextProgress = nextDone ? 1 : 0;
      await this.habitLogRepository.upsertLog(
        habitId,
        date,
        nextDone,
        nextProgress
      );
    }
  }
}
