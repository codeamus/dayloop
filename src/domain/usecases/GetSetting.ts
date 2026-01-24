// src/domain/usecases/GetSetting.ts
import type { SettingsRepository } from "@/domain/repositories/SettingsRepository";

export class GetSetting {
  constructor(private settingsRepository: SettingsRepository) {}

  async execute(key: string): Promise<string | null> {
    return this.settingsRepository.get(key);
  }
}
