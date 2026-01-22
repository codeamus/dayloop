// src/data/sqlite/SqliteHabitLogRepository.ts
import type { HabitId } from "@/domain/entities/Habit";
import type { HabitLog } from "@/domain/entities/HabitLog";
import type { HabitLogRepository } from "@/domain/repositories/HabitLogRepository";
import { randomUUID } from "expo-crypto";
import { db } from "./database";

/**
 * SQLite HabitLogRepository
 * Tabla esperada: habit_logs(id TEXT, habit_id TEXT, date TEXT, done INTEGER)
 *
 * Notas:
 * - date se guarda como "YYYY-MM-DD" (string)
 * - done se guarda como 0/1
 */
export class SqliteHabitLogRepository implements HabitLogRepository {
  /**
   * Logs de un hábito desde cierta fecha (inclusive).
   * Útil para cálculos mensuales/rachas sin traer todo el historial.
   */
  async getLogsForHabitSince(
    habitId: HabitId,
    fromDate: string
  ): Promise<HabitLog[]> {
    const rows = db.getAllSync<{
      id: string;
      habit_id: string;
      date: string;
      done: number;
    }>(
      `
      SELECT * FROM habit_logs
      WHERE habit_id = ? AND date >= ?
      ORDER BY date ASC
    `,
      [habitId, fromDate]
    );

    return rows.map((r) => ({
      id: r.id,
      habitId: r.habit_id,
      date: r.date,
      done: Boolean(r.done),
    }));
  }

  /**
   * Upsert determinístico:
   * - Si existe (habit_id + date), actualiza done
   * - Si no existe, inserta
   *
   * Esto es clave para "toggle por fecha" y para sincronizar UI mensual.
   */
  async upsertLog(
    habitId: HabitId,
    date: string,
    done: boolean
  ): Promise<void> {
    const row = db.getFirstSync<{
      id: string;
      done: number;
    }>("SELECT id, done FROM habit_logs WHERE habit_id = ? AND date = ?", [
      habitId,
      date,
    ]);

    const doneInt = done ? 1 : 0;

    if (!row) {
      db.runSync(
        `
        INSERT INTO habit_logs (id, habit_id, date, done)
        VALUES (?, ?, ?, ?)
      `,
        [randomUUID(), habitId, date, doneInt]
      );
      return;
    }

    db.runSync(
      `
      UPDATE habit_logs
      SET done = ?
      WHERE id = ?
    `,
      [doneInt, row.id]
    );
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
    const rows = db.getAllSync<{
      id: string;
      habit_id: string;
      date: string;
      done: number;
    }>("SELECT * FROM habit_logs WHERE habit_id = ?", [habitId]);

    return rows.map((r) => ({
      id: r.id,
      habitId: r.habit_id,
      date: r.date,
      done: Boolean(r.done),
    }));
  }

  /**
   * Obtiene la fecha del primer registro (MIN(date)) en habit_logs.
   * Retorna null si no hay registros.
   */
  async getEarliestLogDate(): Promise<string | null> {
    const row = db.getFirstSync<{ min_date: string | null }>(
      `SELECT MIN(date) as min_date FROM habit_logs`
    );
    return row?.min_date ?? null;
  }

  /**
   * Toggle legacy (lo mantengo intacto)
   * - Si no existe, inserta done=1
   * - Si existe, invierte done
   */
  async toggle(habitId: HabitId, date: string): Promise<void> {
    const row = db.getFirstSync<{
      id: string;
      done: number;
    }>("SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?", [
      habitId,
      date,
    ]);

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
