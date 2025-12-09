// src/data/sqlite/SqliteHabitRepository.ts
import type { Habit, HabitId } from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";
import { db } from "./database";

export class SqliteHabitRepository implements HabitRepository {
  async getAll(): Promise<Habit[]> {
    const rows = db.getAllSync<{
      id: string;
      name: string;
      color: string;
      icon: string;
      schedule_type: string;
      schedule_days: string | null;
      time_of_day: string;
      time: string;
    }>("SELECT * FROM habits");

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      schedule:
        row.schedule_type === "daily"
          ? { type: "daily" }
          : {
              type: "weekly",
              daysOfWeek: row.schedule_days
                ? JSON.parse(row.schedule_days)
                : [],
            },
      timeOfDay: row.time_of_day as "morning" | "afternoon" | "evening",
      time: row.time,
    }));
  }

  async getById(id: HabitId): Promise<Habit | null> {
    const row = db.getFirstSync<any>("SELECT * FROM habits WHERE id = ?", [id]);

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      schedule:
        row.schedule_type === "daily"
          ? { type: "daily" }
          : {
              type: "weekly",
              daysOfWeek: row.schedule_days
                ? JSON.parse(row.schedule_days)
                : [],
            },
      timeOfDay: row.time_of_day,
      time: row.time,
    };
  }

  async create(habit: Habit): Promise<void> {
    db.runSync(
      `
      INSERT INTO habits (id, name, color, icon, schedule_type, schedule_days, time_of_day, time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        habit.id,
        habit.name,
        habit.color,
        habit.icon,
        habit.schedule.type,
        habit.schedule.type === "weekly"
          ? JSON.stringify(habit.schedule.daysOfWeek)
          : null,
        habit.timeOfDay,
        habit.time,
      ]
    );
  }

  async update(habit: Habit): Promise<void> {
    db.runSync(
      `
      UPDATE habits
      SET
        name = ?,
        color = ?,
        icon = ?,
        schedule_type = ?,
        schedule_days = ?,
        time_of_day = ?,
        time = ?
      WHERE id = ?
    `,
      [
        habit.name,
        habit.color,
        habit.icon,
        habit.schedule.type,
        habit.schedule.type === "weekly"
          ? JSON.stringify(habit.schedule.daysOfWeek)
          : null,
        habit.id,
        habit.timeOfDay,
        habit.time,
      ]
    );
  }

  async delete(id: HabitId): Promise<void> {
    db.runSync("DELETE FROM habits WHERE id = ?", [id]);
    db.runSync("DELETE FROM habit_logs WHERE habit_id = ?", [id]);
  }
}
