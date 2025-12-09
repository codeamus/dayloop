import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("dayloop.db");

// Ejecutado una vez al inicio
export function initDatabase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      schedule_type TEXT NOT NULL,
      schedule_days TEXT,
      time_of_day TEXT,
      time TEXT
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
}
