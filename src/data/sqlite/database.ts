// src/data/sqlite/database.ts
import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("dayloop.db");

const SCHEMA_VERSION = 8;

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
      pause_reason TEXT,

      -- ✅ Múltiples repeticiones
      target_repeats INTEGER,

      -- ✅ Múltiples horarios de recordatorio
      reminder_times TEXT,

      -- ✅ Modo y bloques de tiempo
      mode TEXT,
      time_blocks TEXT
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      done INTEGER NOT NULL,
      progress INTEGER,
      completed_at TEXT,
      UNIQUE(habit_id, date)
    );
  `);

  migrateIfNeeded();
}

/**
 * Verifica si una columna existe en una tabla.
 */
function columnExistsInTable(table: string, column: string): boolean {
  try {
    const columns = db.getAllSync<{ name: string }>(
      `PRAGMA table_info(${table})`
    );
    return columns.some((c) => c.name === column);
  } catch {
    return false;
  }
}

function migrateIfNeeded() {
  const row = db.getFirstSync<{ user_version: number }>(`PRAGMA user_version;`);
  const user_version = row?.user_version ?? 0;

  // Verificar si las columnas de V6 existen, incluso si user_version ya es 6
  // Esto maneja el caso donde la migración falló parcialmente
  const needsV6Migration =
    !columnExistsInTable("habits", "target_repeats") ||
    !columnExistsInTable("habit_logs", "progress");

  // Verificar si las columnas de V7 existen
  const needsV7Migration = !columnExistsInTable("habits", "reminder_times");

  // Verificar si las columnas de V8 existen
  const needsV8Migration =
    !columnExistsInTable("habits", "mode") ||
    !columnExistsInTable("habits", "time_blocks");

  if (
    user_version >= SCHEMA_VERSION &&
    !needsV6Migration &&
    !needsV7Migration &&
    !needsV8Migration
  )
    return;

  db.execSync(`BEGIN TRANSACTION;`);

  try {
    if (user_version < 2) migrateToV2();
    if (user_version < 3) migrateToV3();
    if (user_version < 4) migrateToV4();
    if (user_version < 5) migrateToV5();
    if (user_version < 6 || needsV6Migration) migrateToV6();
    if (user_version < 7 || needsV7Migration) migrateToV7();
    if (user_version < 8) migrateToV8();

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

// ✅ V6 (múltiples repeticiones)
function migrateToV6() {
  // Agregar columnas si no existen
  safeAddColumn("habits", "target_repeats", "INTEGER DEFAULT 1");
  safeAddColumn("habit_logs", "progress", "INTEGER");

  // Inicializar target_repeats = 1 para hábitos existentes (por si acaso)
  try {
    db.execSync(`
      UPDATE habits
      SET target_repeats = 1
      WHERE target_repeats IS NULL;
    `);
  } catch (e) {
    console.warn("[DB] Failed to update target_repeats:", e);
  }

  // Inicializar progress basado en done: si done=1 entonces progress=1, si done=0 entonces progress=0
  try {
    db.execSync(`
      UPDATE habit_logs
      SET progress = done
      WHERE progress IS NULL;
    `);
  } catch (e) {
    console.warn("[DB] Failed to update progress:", e);
  }
}

// ✅ V7 (múltiples horarios de recordatorio)
function migrateToV7() {
  // Agregar columna reminder_times (JSON array de strings "HH:mm")
  safeAddColumn("habits", "reminder_times", "TEXT");

  // Migrar datos existentes: si hay reminder_offset_minutes y start_time,
  // calcular el horario de recordatorio y guardarlo en reminder_times
  try {
    // Obtener hábitos con reminder_offset_minutes pero sin reminder_times
    const habits = db.getAllSync<{
      id: string;
      start_time: string | null;
      reminder_offset_minutes: number | null;
    }>(`
      SELECT id, start_time, reminder_offset_minutes
      FROM habits
      WHERE reminder_times IS NULL
        AND reminder_offset_minutes IS NOT NULL
        AND start_time IS NOT NULL
    `);

    for (const habit of habits) {
      if (!habit.start_time || habit.reminder_offset_minutes === null) continue;

      // Calcular horario de recordatorio: start_time - offset
      const [hStr, mStr] = habit.start_time.split(":").map(Number);
      if (!Number.isFinite(hStr) || !Number.isFinite(mStr)) continue;

      const startMinutes = hStr * 60 + mStr;
      const reminderMinutes = startMinutes - habit.reminder_offset_minutes;
      const reminderHour = Math.floor((reminderMinutes % 1440 + 1440) % 1440 / 60);
      const reminderMin = ((reminderMinutes % 1440 + 1440) % 1440) % 60;

      const reminderTime = `${String(reminderHour).padStart(2, "0")}:${String(reminderMin).padStart(2, "0")}`;
      const reminderTimesJson = JSON.stringify([reminderTime]);

      db.runSync(
        `UPDATE habits SET reminder_times = ? WHERE id = ?`,
        [reminderTimesJson, habit.id]
      );
    }
  } catch (e) {
    console.warn("[DB] Failed to migrate reminder_times:", e);
  }
}

// ✅ V8 (modo y bloques de tiempo)
function migrateToV8() {
  // Agregar columnas mode y time_blocks
  safeAddColumn("habits", "mode", "TEXT");
  safeAddColumn("habits", "time_blocks", "TEXT");

  // Migrar datos existentes: convertir startTime/endTime a timeBlocks
  try {
    const habits = db.getAllSync<{
      id: string;
      start_time: string | null;
      end_time: string | null;
    }>(`
      SELECT id, start_time, end_time
      FROM habits
      WHERE mode IS NULL
        AND (start_time IS NOT NULL OR end_time IS NOT NULL)
    `);

    for (const habit of habits) {
      const startTime = habit.start_time ?? "08:00";
      const endTime = habit.end_time ?? "08:30";

      // Crear un bloque de tiempo desde los datos existentes
      const timeBlocks: Array<{ startTime: string; endTime: string }> = [
        { startTime, endTime },
      ];
      const timeBlocksJson = JSON.stringify(timeBlocks);

      db.runSync(
        `UPDATE habits SET mode = ?, time_blocks = ? WHERE id = ?`,
        ["bloque", timeBlocksJson, habit.id]
      );
    }

    // Para hábitos sin start_time/end_time, establecer modo "puntual"
    db.execSync(`
      UPDATE habits
      SET mode = 'puntual'
      WHERE mode IS NULL
    `);
  } catch (e) {
    console.warn("[DB] Failed to migrate mode/time_blocks:", e);
  }
}

/**
 * Agrega una columna de forma segura, verificando primero si existe.
 * SQLite no soporta IF NOT EXISTS en ALTER TABLE, así que verificamos manualmente.
 */
function safeAddColumn(table: string, column: string, type: string) {
  try {
    // Verificar si la columna ya existe
    const columns = db.getAllSync<{ name: string }>(
      `PRAGMA table_info(${table})`
    );
    const columnExists = columns.some((c) => c.name === column);

    if (columnExists) {
      // La columna ya existe, no hacer nada
      return;
    }

    // Agregar la columna
    db.execSync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  } catch (e) {
    // Si falla, loguear pero no lanzar error (puede ser que ya exista)
    console.warn(
      `[DB] Failed to add column ${table}.${column}:`,
      e instanceof Error ? e.message : String(e)
    );
  }
}

export function resetDatabase() {
  // ✅ Reset real: deja la DB como recién instalada
  // - Borra tablas
  // - Resetea user_version
  // - Recrea schema + migraciones via initDatabase()

  try {
    db.execSync(`BEGIN TRANSACTION;`);

    // (Opcional pero recomendable) corta WAL para evitar residuos
    try {
      db.execSync(`PRAGMA wal_checkpoint(TRUNCATE);`);
    } catch {}

    db.execSync(`
      DROP TABLE IF EXISTS habit_logs;
      DROP TABLE IF EXISTS habits;
    `);

    // Resetea versión para que initDatabase vuelva a correr migraciones/schema limpio
    db.execSync(`PRAGMA user_version = 0;`);

    db.execSync(`COMMIT;`);

    // Limpieza física (no siempre es instantáneo en WAL, pero ayuda)
    try {
      db.execSync(`VACUUM;`);
    } catch {}

    // ✅ Re-crear todo tal como una instalación nueva
    initDatabase();
  } catch (e) {
    try {
      db.execSync(`ROLLBACK;`);
    } catch {}
    console.error("[DB] resetDatabase failed", e);
    throw e;
  }
}
