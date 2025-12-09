// src/data/sqlite/SqliteHabitLogRepository.ts
import type { HabitId } from "@/domain/entities/Habit";
import type { HabitLog } from "@/domain/entities/HabitLog";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import { randomUUID } from "expo-crypto";
import { db } from "./database";

export class SqliteHabitLogRepository implements HabitLogRepository {
  getLogsForHabitSince(habitId: HabitId, fromDate: string): Promise<HabitLog[]> {
    throw new Error("Method not implemented.");
  }
  upsertLog(habitId: HabitId, date: string, done: boolean): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async getLogsForDate(date: string): Promise<HabitLog[]> {
    const rows = db.getAllSync<{
      id: string;
      habit_id: string;
      date: string;
      done: number;
    }>("SELECT * FROM habit_logs WHERE date = ?", [date]);

    return rows.map((r) => ({
      id: r.id,
      habitId: r.habit_id,
      date: r.date,
      done: Boolean(r.done),
    }));
  }

  async getLogsForHabit(habitId: HabitId): Promise<HabitLog[]> {
    const rows = db.getAllSync<any>(
      "SELECT * FROM habit_logs WHERE habit_id = ?",
      [habitId]
    );

    return rows.map((r) => ({
      id: r.id,
      habitId: r.habit_id,
      date: r.date,
      done: Boolean(r.done),
    }));
  }

  async toggle(habitId: HabitId, date: string): Promise<void> {
    const row = db.getFirstSync<any>(
      "SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?",
      [habitId, date]
    );

    if (!row) {
      db.runSync(
        `
        INSERT INTO habit_logs (id, habit_id, date, done)
        VALUES (?, ?, ?, 1)
      `,
        [randomUUID(), habitId, date]
      );
      return;
    }

    const newDone = row.done ? 0 : 1;

    db.runSync(
      `
      UPDATE habit_logs
      SET done = ?
      WHERE id = ?
    `,
      [newDone, row.id]
    );
  }
}
