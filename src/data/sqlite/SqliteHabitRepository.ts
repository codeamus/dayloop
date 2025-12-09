// src/data/sqlite/SqliteHabitRepository.ts
import type {
  EndCondition,
  Habit,
  HabitId,
  HabitSchedule,
  TimeOfDay,
} from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";
import { db } from "./database";

export class SqliteHabitRepository implements HabitRepository {
  async getAll(): Promise<Habit[]> {
    const rows = db.getAllSync<{
      id: string;
      name: string;
      color: string;
      icon: string;
      schedule_type: string; // "daily" | "weekly"
      schedule_days: string | null; // JSON: [0,1,2,...] o null
      end_condition: string | null; // JSON o null
      time_of_day: string | null; // "morning" | "afternoon" | "evening" | null
      time: string | null; // "HH:mm" | null
    }>("SELECT * FROM habits");

    return rows.map((row) => {
      const days: number[] =
        row.schedule_days != null ? JSON.parse(row.schedule_days) : [];

      const schedule: HabitSchedule =
        row.schedule_type === "weekly"
          ? { type: "weekly", daysOfWeek: days }
          : { type: "daily", daysOfWeek: days };

      const endCondition: EndCondition =
        row.end_condition != null
          ? (JSON.parse(row.end_condition) as EndCondition)
          : { type: "none" };

      let timeOfDay: TimeOfDay | undefined;
      if (
        row.time_of_day === "morning" ||
        row.time_of_day === "afternoon" ||
        row.time_of_day === "evening"
      ) {
        timeOfDay = row.time_of_day;
      }

      const habit: Habit = {
        id: row.id,
        name: row.name,
        color: row.color,
        icon: row.icon,
        schedule,
        endCondition,
        timeOfDay,
        time: row.time ?? undefined,
      };

      return habit;
    });
  }

  async getById(id: HabitId): Promise<Habit | null> {
    const row = db.getFirstSync<{
      id: string;
      name: string;
      color: string;
      icon: string;
      schedule_type: string;
      schedule_days: string | null;
      end_condition: string | null;
      time_of_day: string | null;
      time: string | null;
    }>("SELECT * FROM habits WHERE id = ?", [id]);

    if (!row) return null;

    const days: number[] =
      row.schedule_days != null ? JSON.parse(row.schedule_days) : [];

    const schedule: HabitSchedule =
      row.schedule_type === "weekly"
        ? { type: "weekly", daysOfWeek: days }
        : { type: "daily", daysOfWeek: days };

    const endCondition: EndCondition =
      row.end_condition != null
        ? (JSON.parse(row.end_condition) as EndCondition)
        : { type: "none" };

    let timeOfDay: TimeOfDay | undefined;
    if (
      row.time_of_day === "morning" ||
      row.time_of_day === "afternoon" ||
      row.time_of_day === "evening"
    ) {
      timeOfDay = row.time_of_day;
    }

    const habit: Habit = {
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,
      schedule,
      endCondition,
      timeOfDay,
      time: row.time ?? undefined,
    };

    return habit;
  }

  async create(habit: Habit): Promise<void> {
    db.runSync(
      `
      INSERT INTO habits
        (id, name, color, icon, schedule_type, schedule_days, end_condition, time_of_day, time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        habit.id,
        habit.name,
        habit.color,
        habit.icon,
        habit.schedule.type,
        JSON.stringify(habit.schedule.daysOfWeek ?? []),
        JSON.stringify(habit.endCondition),
        habit.timeOfDay ?? null,
        habit.time ?? null,
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
        end_condition = ?,
        time_of_day = ?,
        time = ?
      WHERE id = ?
    `,
      [
        habit.name,
        habit.color,
        habit.icon,
        habit.schedule.type,
        JSON.stringify(habit.schedule.daysOfWeek ?? []),
        JSON.stringify(habit.endCondition),
        habit.timeOfDay ?? null,
        habit.time ?? null,
        habit.id,
      ]
    );
  }

  async delete(id: HabitId): Promise<void> {
    db.runSync("DELETE FROM habits WHERE id = ?", [id]);
    db.runSync("DELETE FROM habit_logs WHERE habit_id = ?", [id]);
  }
}
