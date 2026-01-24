// src/core/di/container.ts
import { SqliteHabitLogRepository } from "@/data/sqlite/SqliteHabitLogRepository";
import { SqliteHabitRepository } from "@/data/sqlite/SqliteHabitRepository";
import { SqliteSettingsRepository } from "@/data/sqlite/SqliteSettingsRepository";

import { CreateHabit } from "@/domain/usecases/CreateHabit";
import { DeleteHabit } from "@/domain/usecases/DeleteHabit";
import { GetAllHabits } from "@/domain/usecases/GetAllHabits";
import { GetFullHistory } from "@/domain/usecases/GetFullHistory";
import { GetHabitMonthlyStats } from "@/domain/usecases/GetHabitMonthlyStats";
import { GetHabitStreaks } from "@/domain/usecases/GetHabitStreaks";
import { GetSetting } from "@/domain/usecases/GetSetting";
import { GetTodayHabits } from "@/domain/usecases/GetTodayHabits";
import { GetWeeklySummary } from "@/domain/usecases/GetWeeklySummary";
import { IncrementHabitProgress } from "@/domain/usecases/IncrementHabitProgress";
import { SetHabitPaused } from "@/domain/usecases/SetHabitPaused";
import { SetSetting } from "@/domain/usecases/SetSetting";
import { ToggleHabitForDate } from "@/domain/usecases/ToggleHabitForDate";
import { ToggleHabitForToday } from "@/domain/usecases/ToggleHabitForToday";
import { UpdateHabit } from "@/domain/usecases/UpdateHabit";

import { ExpoCalendarSyncService } from "@/infraestructure/calendar/ExpoCalendarSyncService";
import { ExpoNotificationScheduler } from "@/infraestructure/notifications/ExpoNotificationScheduler";

const SETTINGS_KEY_CALENDAR_SYNC = "calendar_sync_enabled";

class Container {
  habitRepository = new SqliteHabitRepository();
  habitLogRepository = new SqliteHabitLogRepository();
  settingsRepository = new SqliteSettingsRepository();

  notificationScheduler = new ExpoNotificationScheduler();
  calendarSyncService = new ExpoCalendarSyncService();

  // Home / Today
  getTodayHabits = new GetTodayHabits(
    this.habitRepository,
    this.habitLogRepository
  );
  toggleHabitForToday = new ToggleHabitForToday(
    this.habitRepository,
    this.habitLogRepository
  );
  incrementHabitProgress = new IncrementHabitProgress(
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
  getFullHistory = new GetFullHistory(
    this.habitRepository,
    this.habitLogRepository
  );

  getSetting = new GetSetting(this.settingsRepository);
  setSetting = new SetSetting(this.settingsRepository);
}

export const container = new Container();
export { SETTINGS_KEY_CALENDAR_SYNC };
