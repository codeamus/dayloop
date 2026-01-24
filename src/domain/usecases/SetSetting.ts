// src/domain/usecases/SetSetting.ts
import type { SettingsRepository } from "@/domain/repositories/SettingsRepository";

export class SetSetting {
  constructor(private settingsRepository: SettingsRepository) {}

  async execute(key: string, value: string): Promise<void> {
    await this.settingsRepository.set(key, value);
  }
}
