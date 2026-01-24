// src/domain/repositories/SettingsRepository.ts

export interface SettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}
