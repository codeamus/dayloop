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

type HabitRow = {
  id: string;
  name: string;
  color: string;
  icon: string;

  schedule_type: "daily" | "weekly";
  schedule_days: string | null; // JSON: number[]
  end_condition: string | null; // JSON EndCondition
  time_of_day: TimeOfDay | null;

  // legacy
  time: string | null;

  // nuevo
  start_time: string | null;
  end_time: string | null;
  calendar_event_id: string | null;

  reminder_offset_minutes: number | null;
};

function parseSchedule(row: HabitRow): HabitSchedule {
  if (row.schedule_type === "weekly") {
    const days: number[] = row.schedule_days
      ? JSON.parse(row.schedule_days)
      : [];
    return { type: "weekly", daysOfWeek: days };
  }
  return { type: "daily" };
}

function parseEndCondition(row: HabitRow): EndCondition {
  return row.end_condition
    ? (JSON.parse(row.end_condition) as EndCondition)
    : { type: "none" };
}

function rowToHabit(row: HabitRow): Habit {
  const schedule = parseSchedule(row);
  const endCondition = parseEndCondition(row);

  const startTime = row.start_time ?? row.time ?? "08:00"; // fallback seguro
  const endTime = row.end_time ?? null;

  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,

    schedule,
    endCondition,

    startTime,
    endTime,

    // legacy
    time: row.time ?? startTime,

    timeOfDay: row.time_of_day ?? undefined,

    calendarEventId: row.calendar_event_id ?? null,

    reminderOffsetMinutes: row.reminder_offset_minutes ?? null,
  };
}

export class SqliteHabitRepository implements HabitRepository {
  async getAll(): Promise<Habit[]> {
    const rows = db.getAllSync<HabitRow>("SELECT * FROM habits");
    return rows.map(rowToHabit);
  }

  async getById(id: HabitId): Promise<Habit | null> {
    const row = db.getFirstSync<HabitRow>("SELECT * FROM habits WHERE id = ?", [
      id,
    ]);
    return row ? rowToHabit(row) : null;
  }

  async create(habit: Habit): Promise<void> {
    // startTime requerido en dominio, pero igual protegemos por si legacy
    const startTime = habit.startTime ?? habit.time ?? "08:00";

    db.runSync(
      `
      INSERT INTO habits
        (
          id, name, color, icon,
          schedule_type, schedule_days,
          end_condition, time_of_day,
          time,
          start_time, end_time, calendar_event_id,
          reminder_offset_minutes
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

        JSON.stringify(habit.endCondition),
        habit.timeOfDay ?? null,

        // legacy
        habit.time ?? startTime,

        // nuevo
        startTime,
        habit.endTime ?? null,
        habit.calendarEventId ?? null,

        habit.reminderOffsetMinutes ?? null,
      ]
    );
  }

  async update(habit: Habit): Promise<void> {
    const startTime = habit.startTime ?? habit.time ?? "08:00";

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

        time = ?,
        start_time = ?,
        end_time = ?,
        calendar_event_id = ?,

        reminder_offset_minutes = ?
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

        JSON.stringify(habit.endCondition),
        habit.timeOfDay ?? null,

        // legacy
        habit.time ?? startTime,

        // nuevo
        startTime,
        habit.endTime ?? null,
        habit.calendarEventId ?? null,

        habit.reminderOffsetMinutes ?? null,

        habit.id,
      ]
    );
  }

  async delete(id: HabitId): Promise<void> {
    db.runSync("DELETE FROM habits WHERE id = ?", [id]);
    db.runSync("DELETE FROM habit_logs WHERE habit_id = ?", [id]);
  }
}
