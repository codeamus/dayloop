// src/domain/usecases/AutoDisableExpiredHabits.ts

import type { Habit } from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";
import type { NotificationScheduler } from "@/domain/services/NotificationScheduler";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isEnded(h: Habit, today: string): boolean {
  const ec = h.endCondition;
  if (!ec || ec.type === "none") return false;
  if (ec.type === "byDate") {
    // Strings YYYY-MM-DD comparan bien lexicográficamente
    return ec.endDate < today;
  }
  return false;
}

export class AutoDisableExpiredHabits {
  constructor(
    private habitRepository: HabitRepository,
    private notificationScheduler: NotificationScheduler
  ) {}

  /**
   * Desactiva (pausa) hábitos cuyo endDate ya pasó.
   * Es idempotente: si ya está pausado por "ended", no hace nada.
   */
  async execute(): Promise<{ disabledCount: number }> {
    const today = todayISO();
    const habits = await this.habitRepository.getAll();

    let disabledCount = 0;

    for (const h of habits) {
      if (!isEnded(h, today)) continue;

      const alreadyPausedByEnded = h.isPaused && h.pauseReason === "ended";
      if (alreadyPausedByEnded) continue;

      // 1) cancelar notificaciones robusto
      try {
        if (this.notificationScheduler.cancelByHabitId) {
          await this.notificationScheduler.cancelByHabitId(h.id);
        }
      } catch (e) {
        console.warn("[AutoDisableExpiredHabits] cancelByHabitId failed", e);
      }

      // 2) cancelar por IDs (si existieran)
      try {
        if (h.notificationIds?.length) {
          await this.notificationScheduler.cancel(h.notificationIds);
        }
      } catch (e) {
        console.warn("[AutoDisableExpiredHabits] cancel(ids) failed", e);
      }

      // 3) limpiar IDs persistidos
      try {
        await this.habitRepository.updateNotifications(h.id, []);
      } catch (e) {
        console.warn(
          "[AutoDisableExpiredHabits] updateNotifications failed",
          e
        );
      }

      // 4) pausar hábito
      const updated: Habit = {
        ...h,
        isPaused: true,
        pausedAt: today,
        pauseReason: "ended",
        notificationIds: [],
      };

      await this.habitRepository.update(updated);

      disabledCount += 1;
    }

    return { disabledCount };
  }
}
