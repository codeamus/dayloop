// src/data/sqlite/SqliteSettingsRepository.ts
import type { SettingsRepository } from "@/domain/repositories/SettingsRepository";
import { db } from "./database";

export class SqliteSettingsRepository implements SettingsRepository {
  async get(key: string): Promise<string | null> {
    try {
      const row = db.getFirstSync<{ value: string | null }>(
        `SELECT value FROM settings WHERE key = ?`,
        [key]
      );
      return row?.value ?? null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    db.runSync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      [key, value]
    );
  }
}
