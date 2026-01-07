// src/domain/repositories/HabitRepository.ts

import type { Habit, HabitId } from "@/domain/entities/Habit";

export interface HabitRepository {
  getAll(): Promise<Habit[]>;
  getById(id: HabitId): Promise<Habit | null>;
  create(habit: Habit): Promise<void>;
  update(habit: Habit): Promise<void>;
  delete(id: HabitId): Promise<void>;

  // ✅ persistir ids de notificaciones (JSON en SQLite)
  updateNotifications(id: HabitId, notificationIds: string[]): Promise<void>;
}
