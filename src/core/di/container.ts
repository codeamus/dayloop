// src/core/di/container.ts
import { SqliteHabitLogRepository } from "@/data/sqlite/SqliteHabitLogRepository";
import { SqliteHabitRepository } from "@/data/sqlite/SqliteHabitRepository";

import { CreateHabit } from "@/domain/usecases/CreateHabit";
import { DeleteHabit } from "@/domain/usecases/DeleteHabit";
import { GetAllHabits } from "@/domain/usecases/GetAllHabits";
import { GetHabitMonthlyStats } from "@/domain/usecases/GetHabitMonthlyStats";
import { GetHabitStreaks } from "@/domain/usecases/GetHabitStreaks";
import { GetTodayHabits } from "@/domain/usecases/GetTodayHabits";
import { GetWeeklySummary } from "@/domain/usecases/GetWeeklySummary";
import { SetHabitPaused } from "@/domain/usecases/SetHabitPaused";
import { ToggleHabitForDate } from "@/domain/usecases/ToggleHabitForDate";
import { ToggleHabitForToday } from "@/domain/usecases/ToggleHabitForToday";
import { UpdateHabit } from "@/domain/usecases/UpdateHabit";

import { ExpoNotificationScheduler } from "@/infraestructure/notifications/ExpoNotificationScheduler";

class Container {
  habitRepository = new SqliteHabitRepository();
  habitLogRepository = new SqliteHabitLogRepository();

  notificationScheduler = new ExpoNotificationScheduler();

  // Home / Today
  getTodayHabits = new GetTodayHabits(
    this.habitRepository,
    this.habitLogRepository
  );
  toggleHabitForToday = new ToggleHabitForToday(
    this.habitRepository,
    this.habitLogRepository
  );
  toggleHabitForDate = new ToggleHabitForDate(
    this.habitRepository,
    this.habitLogRepository
  );

  // CRUD
  createHabit = new CreateHabit(
    this.habitRepository,
    this.notificationScheduler
  );
  getAllHabits = new GetAllHabits(this.habitRepository);

  deleteHabit = new DeleteHabit(
    this.habitRepository,
    this.notificationScheduler
  );

  // ✅ Update simple
  updateHabit = new UpdateHabit(
    this.habitRepository,
    this.notificationScheduler
  );

  // ✅ Pause / resume
  setHabitPaused = new SetHabitPaused(
    this.habitRepository,
    this.notificationScheduler
  );

  // Summaries / Stats
  getWeeklySummary = new GetWeeklySummary(
    this.habitRepository,
    this.habitLogRepository
  );
  getHabitStreaks = new GetHabitStreaks(
    this.habitRepository,
    this.habitLogRepository
  );
  getHabitMonthlyStats = new GetHabitMonthlyStats(
    this.habitRepository,
    this.habitLogRepository
  );
}

export const container = new Container();
