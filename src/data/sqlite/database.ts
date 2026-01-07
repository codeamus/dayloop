// src/data/sqlite/database.ts
import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("dayloop.db");

const SCHEMA_VERSION = 5;

export function initDatabase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      schedule_type TEXT NOT NULL,
      schedule_days TEXT,
      end_condition TEXT,
      time_of_day TEXT,

      -- LEGACY
      time TEXT,

      -- Bloques
      start_time TEXT,
      end_time TEXT,
      calendar_event_id TEXT,

      reminder_offset_minutes INTEGER,

      -- Notifs
      notification_ids TEXT,

      -- ✅ Pausa
      is_paused INTEGER,
      paused_at TEXT,
      pause_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      done INTEGER NOT NULL,
      completed_at TEXT,
      UNIQUE(habit_id, date)
    );
  `);

  migrateIfNeeded();
}

function migrateIfNeeded() {
  const row = db.getFirstSync<{ user_version: number }>(`PRAGMA user_version;`);
  const user_version = row?.user_version ?? 0;

  if (user_version >= SCHEMA_VERSION) return;

  db.execSync(`BEGIN TRANSACTION;`);

  try {
    if (user_version < 2) migrateToV2();
    if (user_version < 3) migrateToV3();
    if (user_version < 4) migrateToV4();
    if (user_version < 5) migrateToV5();

    db.execSync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
    db.execSync(`COMMIT;`);
  } catch (e) {
    console.error("[DB] Migration failed", e);
    db.execSync(`ROLLBACK;`);
    throw e;
  }
}

// V2
function migrateToV2() {
  safeAddColumn("habits", "start_time", "TEXT");
  safeAddColumn("habits", "end_time", "TEXT");
  safeAddColumn("habits", "calendar_event_id", "TEXT");

  db.execSync(`
    UPDATE habits
    SET start_time = time
    WHERE start_time IS NULL AND time IS NOT NULL;
  `);

  db.execSync(`
    UPDATE habits
    SET end_time =
      printf(
        '%02d:%02d',
        ((CAST(substr(start_time, 1, 2) AS INTEGER) * 60 +
          CAST(substr(start_time, 4, 2) AS INTEGER) + 30) / 60) % 24,
        (CAST(substr(start_time, 1, 2) AS INTEGER) * 60 +
         CAST(substr(start_time, 4, 2) AS INTEGER) + 30) % 60
      )
    WHERE end_time IS NULL
      AND start_time IS NOT NULL
      AND start_time GLOB '[0-2][0-9]:[0-5][0-9]';
  `);

  db.execSync(`
    UPDATE habits
    SET start_time = '08:00', end_time = '08:30'
    WHERE start_time IS NULL;
  `);

  db.execSync(`
    UPDATE habits
    SET end_time = '08:30'
    WHERE end_time IS NULL;
  `);
}

// V3
function migrateToV3() {
  db.execSync(`
    UPDATE habits
    SET schedule_type = 'daily'
    WHERE schedule_type IS NULL OR trim(schedule_type) = '';
  `);

  db.execSync(`
    UPDATE habits
    SET schedule_days = '[]'
    WHERE schedule_type IN ('weekly','monthly')
      AND (schedule_days IS NULL OR trim(schedule_days) = '');
  `);

  db.execSync(`
    UPDATE habits
    SET end_condition = '{"type":"none"}'
    WHERE end_condition IS NULL OR trim(end_condition) = '';
  `);
}

// V4 (notificaciones)
function migrateToV4() {
  safeAddColumn("habits", "notification_ids", "TEXT");

  db.execSync(`
    UPDATE habits
    SET notification_ids = '[]'
    WHERE notification_ids IS NULL OR trim(notification_ids) = '';
  `);
}

// ✅ V5 (pausa)
function migrateToV5() {
  safeAddColumn("habits", "is_paused", "INTEGER");
  safeAddColumn("habits", "paused_at", "TEXT");
  safeAddColumn("habits", "pause_reason", "TEXT");

  db.execSync(`
    UPDATE habits
    SET is_paused = 0
    WHERE is_paused IS NULL;
  `);

  db.execSync(`
    UPDATE habits
    SET paused_at = NULL
    WHERE paused_at IS NULL;
  `);

  db.execSync(`
    UPDATE habits
    SET pause_reason = NULL
    WHERE pause_reason IS NULL;
  `);
}

function safeAddColumn(table: string, column: string, type: string) {
  try {
    db.execSync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  } catch {
    // ya existe
  }
}
