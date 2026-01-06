// src/core/di/container.ts
import { SqliteHabitLogRepository } from "@/data/sqlite/SqliteHabitLogRepository";
import { SqliteHabitRepository } from "@/data/sqlite/SqliteHabitRepository";

import { CreateHabit } from "@/domain/usecases/CreateHabit";
import { DeleteHabit } from "@/domain/usecases/DeleteHabit";
import { GetAllHabits } from "@/domain/usecases/GetAllHabits";
import { GetHabitMonthlyStats } from "@/domain/usecases/GetHabitMonthlyStats"; // ✅ NUEVO
import { GetHabitStreaks } from "@/domain/usecases/GetHabitStreaks";
import { GetTodayHabits } from "@/domain/usecases/GetTodayHabits";
import { GetWeeklySummary } from "@/domain/usecases/GetWeeklySummary";
import { ToggleHabitForToday } from "@/domain/usecases/ToggleHabitForToday";
import { UpdateHabit } from "@/domain/usecases/UpdateHabit";

/**
 * Container DI (simple):
 * - Instancia repositorios una sola vez.
 * - Expone usecases listos para ejecutar.
 */
class Container {
  // =========================
  // Repositorios (data layer)
  // =========================
  habitRepository = new SqliteHabitRepository();
  habitLogRepository = new SqliteHabitLogRepository();

  // =========================
  // Usecases (domain layer)
  // =========================

  // Home / Today
  getTodayHabits = new GetTodayHabits(
    this.habitRepository,
    this.habitLogRepository
  );

  toggleHabitForToday = new ToggleHabitForToday(
    this.habitRepository,
    this.habitLogRepository
  );

  // CRUD
  createHabit = new CreateHabit(this.habitRepository);
  getAllHabits = new GetAllHabits(this.habitRepository);
  deleteHabit = new DeleteHabit(this.habitRepository);
  updateHabit = new UpdateHabit(this.habitRepository);

  // Summaries / Stats
  getWeeklySummary = new GetWeeklySummary(
    this.habitRepository,
    this.habitLogRepository
  );

  getHabitStreaks = new GetHabitStreaks(
    this.habitRepository,
    this.habitLogRepository
  );

  // ✅ NUEVO: Stats mensuales reales (scheduled vs done + streak mensual)
  // Esto lo consume useHabitMonthlyStats() para renderizar el calendario mensual.
  getHabitMonthlyStats = new GetHabitMonthlyStats(
    this.habitRepository,
    this.habitLogRepository
  );
}

export const container = new Container();
