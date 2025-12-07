import { SqliteHabitLogRepository } from "@/data/sqlite/SqliteHabitLogRepository";
import { SqliteHabitRepository } from "@/data/sqlite/SqliteHabitRepository";

import { CreateHabit } from "@/domain/usecases/CreateHabit";
import { DeleteHabit } from "@/domain/usecases/DeleteHabit";
import { GetAllHabits } from "@/domain/usecases/GetAllHabits";
import { GetTodayHabits } from "@/domain/usecases/GetTodayHabits";
import { ToggleHabitForToday } from "@/domain/usecases/ToggleHabitForToday";
import { UpdateHabit } from "@/domain/usecases/UpdateHabit";

class Container {
  habitRepository = new SqliteHabitRepository();
  habitLogRepository = new SqliteHabitLogRepository();

  getTodayHabits = new GetTodayHabits(
    this.habitRepository,
    this.habitLogRepository
  );

  toggleHabitForToday = new ToggleHabitForToday(
    this.habitRepository,
    this.habitLogRepository
  );

  createHabit = new CreateHabit(this.habitRepository);
  getAllHabits = new GetAllHabits(this.habitRepository);
  deleteHabit = new DeleteHabit(this.habitRepository);
  updateHabit = new UpdateHabit(this.habitRepository);
}

export const container = new Container();
