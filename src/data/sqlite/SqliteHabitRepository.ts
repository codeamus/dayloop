// src/data/sqlite/SqliteHabitRepository.ts
import { db } from "@/data/sqlite/database";
import type {
  Habit,
  HabitId,
  HabitSchedule,
  PauseReason,
  TimeOfDay,
} from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";

type HabitRow = {
  id: string;
  name: string;
  color: string;
  icon: string;

  schedule_type: "daily" | "weekly" | "monthly" | string;
  schedule_days: string | null;

  end_condition: string | null;
  time_of_day: string | null;

  time: string | null;
  start_time: string | null;
  end_time: string | null;

  calendar_event_id: string | null;
  reminder_offset_minutes: number | null;
  reminder_times?: string | null;

  notification_ids?: string | null;

  // ✅ pause
  is_paused?: number | null;
  paused_at?: string | null;
  pause_reason?: PauseReason | null;

      // ✅ múltiples repeticiones
      target_repeats?: number | null;

  // ✅ Modo y bloques de tiempo
      mode?: string | null;
      time_blocks?: string | null;
};

/**
 * Verifica si una columna existe en una tabla.
 * Útil para manejar bases de datos que pueden estar en proceso de migración.
 */
function columnExists(table: string, column: string): boolean {
  try {
    const columns = db.getAllSync<{ name: string }>(
      `PRAGMA table_info(${table})`
    );
    return columns.some((c) => c.name === column);
  } catch {
    return false;
  }
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeTimeOfDay(v: unknown): TimeOfDay {
  if (v === "morning" || v === "afternoon" || v === "evening") return v;
  return "morning";
}

function scheduleFromRow(row: HabitRow): HabitSchedule {
  const type = (row.schedule_type || "daily").trim();

  if (type === "weekly") {
    const days = safeJsonParse<number[]>(row.schedule_days, []);
    return { type: "weekly", daysOfWeek: Array.isArray(days) ? days : [] };
  }

  if (type === "monthly") {
    const days = safeJsonParse<number[]>(row.schedule_days, []);
    return { type: "monthly", daysOfMonth: Array.isArray(days) ? days : [] };
  }

  return { type: "daily" };
}

function toHabit(row: HabitRow): Habit {
  const schedule = scheduleFromRow(row);

  const startTime = row.start_time ?? row.time ?? "08:00";
  const endTime = row.end_time ?? "08:30";

  const endCondition = safeJsonParse<any>(row.end_condition, { type: "none" });

  const notificationIds = safeJsonParse<string[]>(
    row.notification_ids ?? "[]",
    []
  ).filter((x) => typeof x === "string");

    const isPaused = (row.is_paused ?? 0) === 1;

    // Manejar target_repeats de forma defensiva (puede no existir en DBs antiguas)
    // Nota: columnExists se llama desde fuera de la clase, así que usamos una función helper
    let targetRepeats = 1;
    try {
      const columns = db.getAllSync<{ name: string }>(
        `PRAGMA table_info(habits)`
      );
      const hasTargetRepeats = columns.some((c) => c.name === "target_repeats");
      if (hasTargetRepeats) {
        targetRepeats = row.target_repeats ?? 1;
      }
    } catch {
      // Si falla, usar default
    }

    return {
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon,

      schedule,

      startTime,
      endTime,

      time: row.time ?? startTime,

      timeOfDay: normalizeTimeOfDay(row.time_of_day),

      reminderOffsetMinutes:
        row.reminder_offset_minutes === null ||
        row.reminder_offset_minutes === undefined
          ? null
          : Number(row.reminder_offset_minutes),

      calendarEventId: row.calendar_event_id ?? null,

      endCondition,

      notificationIds,

      // ✅ Múltiples horarios de recordatorio
      reminderTimes: safeJsonParse<string[]>(
        row.reminder_times ?? "[]",
        []
      ).filter((x) => typeof x === "string" && /^\d{2}:\d{2}$/.test(x)),

      // ✅ Modo y bloques de tiempo
      mode: (row.mode === "puntual" || row.mode === "bloque"
        ? row.mode
        : "bloque") as "puntual" | "bloque",
      timeBlocks: safeJsonParse<Array<{ startTime: string; endTime: string }>>(
        row.time_blocks ?? "[]",
        []
      ).filter(
        (b) =>
          typeof b === "object" &&
          b !== null &&
          typeof (b as any).startTime === "string" &&
          typeof (b as any).endTime === "string"
      ) as Array<{ startTime: string; endTime: string }>,

      // ✅ pause
      isPaused,
      pausedAt: row.paused_at ?? null,
      pauseReason: row.pause_reason ?? null,

      // ✅ múltiples repeticiones
      targetRepeats,
    };
}

export class SqliteHabitRepository implements HabitRepository {
  /**
   * Verifica si una columna existe en una tabla.
   * Útil para manejar bases de datos que pueden estar en proceso de migración.
   */
  private columnExists(table: string, column: string): boolean {
    try {
      const columns = db.getAllSync<{ name: string }>(
        `PRAGMA table_info(${table})`
      );
      return columns.some((c) => c.name === column);
    } catch {
      return false;
    }
  }

  async create(habit: Habit): Promise<void> {
    const scheduleType = habit.schedule?.type ?? "daily";
    const scheduleDays =
      scheduleType === "weekly"
        ? JSON.stringify((habit.schedule as any).daysOfWeek ?? [])
        : scheduleType === "monthly"
        ? JSON.stringify((habit.schedule as any).daysOfMonth ?? [])
        : null;

    const startTime = habit.startTime ?? habit.time ?? "08:00";
    const endTime = habit.endTime ?? "08:30";
    const timeOfDay = habit.timeOfDay ?? "morning";

    // Construir query dinámicamente según columnas disponibles
    const hasTargetRepeats = this.columnExists("habits", "target_repeats");
    const hasReminderTimes = this.columnExists("habits", "reminder_times");
    const hasMode = this.columnExists("habits", "mode");
    const hasTimeBlocks = this.columnExists("habits", "time_blocks");
    
    const columns = [
      "id", "name", "color", "icon",
      "schedule_type", "schedule_days",
      "end_condition", "time_of_day",
      "time",
      "start_time", "end_time",
      "calendar_event_id",
      "reminder_offset_minutes",
      "notification_ids",
      "is_paused", "paused_at", "pause_reason",
    ];
    
    const values: any[] = [
      habit.id,
      habit.name,
      habit.color,
      habit.icon,
      scheduleType,
      scheduleDays,
      JSON.stringify(habit.endCondition ?? { type: "none" }),
      timeOfDay,
      habit.time ?? startTime,
      startTime,
      endTime,
      habit.calendarEventId ?? null,
      habit.reminderOffsetMinutes ?? null,
      JSON.stringify(habit.notificationIds ?? []),
      habit.isPaused ? 1 : 0,
      habit.pausedAt ?? null,
      habit.pauseReason ?? null,
    ];

    if (hasTargetRepeats) {
      columns.push("target_repeats");
      values.push(habit.targetRepeats ?? 1);
    }

    if (hasReminderTimes) {
      columns.push("reminder_times");
      values.push(JSON.stringify(habit.reminderTimes ?? []));
    }

    if (hasMode) {
      columns.push("mode");
      values.push(habit.mode ?? "bloque");
    }

    if (hasTimeBlocks) {
      columns.push("time_blocks");
      values.push(JSON.stringify(habit.timeBlocks ?? []));
    }

    const placeholders = values.map(() => "?").join(", ");
    
    db.runSync(
      `
      INSERT INTO habits (${columns.join(", ")})
      VALUES (${placeholders})
      `,
      values
    );
  }

  async delete(id: HabitId): Promise<void> {
    db.runSync(`DELETE FROM habits WHERE id = ?`, [id]);
  }

  async getAll(): Promise<Habit[]> {
    const rows = db.getAllSync<HabitRow>(
      `SELECT * FROM habits ORDER BY rowid DESC`
    );
    return (rows ?? []).map(toHabit);
  }

  async getById(id: HabitId): Promise<Habit | null> {
    const row = db.getFirstSync<HabitRow>(`SELECT * FROM habits WHERE id = ?`, [
      id,
    ]);
    return row ? toHabit(row) : null;
  }

  async update(habit: Habit): Promise<void> {
    const scheduleType = habit.schedule?.type ?? "daily";
    const scheduleDays =
      scheduleType === "weekly"
        ? JSON.stringify((habit.schedule as any).daysOfWeek ?? [])
        : scheduleType === "monthly"
        ? JSON.stringify((habit.schedule as any).daysOfMonth ?? [])
        : null;

    const startTime = habit.startTime ?? habit.time ?? "08:00";
    const endTime = habit.endTime ?? "08:30";
    const timeOfDay = habit.timeOfDay ?? "morning";

    // Construir UPDATE dinámicamente según columnas disponibles
    const hasTargetRepeats = this.columnExists("habits", "target_repeats");
    const hasReminderTimes = this.columnExists("habits", "reminder_times");
    const hasMode = this.columnExists("habits", "mode");
    const hasTimeBlocks = this.columnExists("habits", "time_blocks");
    
    const setClauses = [
      "name = ?",
      "color = ?",
      "icon = ?",
      "schedule_type = ?",
      "schedule_days = ?",
      "end_condition = ?",
      "time_of_day = ?",
      "time = ?",
      "start_time = ?",
      "end_time = ?",
      "calendar_event_id = ?",
      "reminder_offset_minutes = ?",
      "notification_ids = ?",
      "is_paused = ?",
      "paused_at = ?",
      "pause_reason = ?",
    ];
    
    const values: any[] = [
      habit.name,
      habit.color,
      habit.icon,
      scheduleType,
      scheduleDays,
      JSON.stringify(habit.endCondition ?? { type: "none" }),
      timeOfDay,
      habit.time ?? startTime,
      startTime,
      endTime,
      habit.calendarEventId ?? null,
      habit.reminderOffsetMinutes ?? null,
      JSON.stringify(habit.notificationIds ?? []),
      habit.isPaused ? 1 : 0,
      habit.pausedAt ?? null,
      habit.pauseReason ?? null,
    ];

    if (hasTargetRepeats) {
      setClauses.push("target_repeats = ?");
      values.push(habit.targetRepeats ?? 1);
    }

    if (hasReminderTimes) {
      setClauses.push("reminder_times = ?");
      values.push(JSON.stringify(habit.reminderTimes ?? []));
    }

    if (hasMode) {
      setClauses.push("mode = ?");
      values.push(habit.mode ?? "bloque");
    }

    if (hasTimeBlocks) {
      setClauses.push("time_blocks = ?");
      values.push(JSON.stringify(habit.timeBlocks ?? []));
    }

    values.push(habit.id);

    db.runSync(
      `
      UPDATE habits
      SET ${setClauses.join(", ")}
      WHERE id = ?
      `,
      values
    );
  }

  async updateNotifications(id: HabitId, notificationIds: string[]) {
    db.runSync(`UPDATE habits SET notification_ids = ? WHERE id = ?`, [
      JSON.stringify(notificationIds ?? []),
      id,
    ]);
  }

  async updatePauseState(params: {
    id: HabitId;
    isPaused: boolean;
    pausedAt: string | null;
    pauseReason: PauseReason | null;
  }): Promise<void> {
    db.runSync(
      `UPDATE habits SET is_paused = ?, paused_at = ?, pause_reason = ? WHERE id = ?`,
      [
        params.isPaused ? 1 : 0,
        params.pausedAt ?? null,
        params.pauseReason ?? null,
        params.id,
      ]
    );
  }
}
