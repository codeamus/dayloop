// src/data/sqlite/SqliteHabitLogRepository.ts
import type { HabitId } from "@/domain/entities/Habit";
import type { HabitLog } from "@/domain/entities/HabitLog";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import { db } from "./database";

function buildLogId(habitId: HabitId, date: string): string {
  // Estrategia simple: ID determinista por hábito+fecha
  return `${habitId}:${date}`;
}

export class SqliteHabitLogRepository implements HabitLogRepository {
  async getLogsForDate(date: string): Promise<HabitLog[]> {
    const rows = db.getAllSync<{
      id: string;
      habit_id: string;
      date: string;
      done: number;
      completed_at: string | null;
    }>("SELECT * FROM habit_logs WHERE date = ?", [date]);

    return rows.map((row) => ({
      habitId: row.habit_id,
      date: row.date,
      done: row.done === 1,
      completedAt: row.completed_at ?? undefined,
    }));
  }

  async getLogsForHabit(habitId: HabitId): Promise<HabitLog[]> {
    const rows = db.getAllSync<{
      id: string;
      habit_id: string;
      date: string;
      done: number;
      completed_at: string | null;
    }>("SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY date ASC", [
      habitId,
    ]);

    return rows.map((row) => ({
      habitId: row.habit_id,
      date: row.date,
      done: row.done === 1,
      completedAt: row.completed_at ?? undefined,
    }));
  }

  async getLogsForHabitSince(
    habitId: HabitId,
    fromDate: string
  ): Promise<HabitLog[]> {
    const rows = db.getAllSync<{
      id: string;
      habit_id: string;
      date: string;
      done: number;
      completed_at: string | null;
    }>(
      "SELECT * FROM habit_logs WHERE habit_id = ? AND date >= ? ORDER BY date ASC",
      [habitId, fromDate]
    );

    return rows.map((row) => ({
      habitId: row.habit_id,
      date: row.date,
      done: row.done === 1,
      completedAt: row.completed_at ?? undefined,
    }));
  }

  async toggle(habitId: HabitId, date: string): Promise<void> {
    const existing = db.getFirstSync<{
      id: string;
      habit_id: string;
      date: string;
      done: number;
      completed_at: string | null;
    }>("SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?", [
      habitId,
      date,
    ]);

    if (!existing) {
      // no había log → lo marcamos como done = 1
      db.runSync(
        `
        INSERT INTO habit_logs (id, habit_id, date, done, completed_at)
        VALUES (?, ?, ?, ?, ?)
      `,
        [buildLogId(habitId, date), habitId, date, 1, new Date().toISOString()]
      );
      return;
    }

    const newDone = existing.done === 1 ? 0 : 1;

    db.runSync(
      `
      UPDATE habit_logs
      SET done = ?, completed_at = ?
      WHERE habit_id = ? AND date = ?
    `,
      [newDone, newDone === 1 ? new Date().toISOString() : null, habitId, date]
    );
  }

  async upsertLog(
    habitId: HabitId,
    date: string,
    done: boolean
  ): Promise<void> {
    const id = buildLogId(habitId, date);

    db.runSync(
      `
      INSERT INTO habit_logs (id, habit_id, date, done, completed_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        done = excluded.done,
        completed_at = excluded.completed_at
    `,
      [id, habitId, date, done ? 1 : 0, done ? new Date().toISOString() : null]
    );
  }
}
