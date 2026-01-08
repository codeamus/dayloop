// src/domain/usecases/SetHabitPaused.ts
import type { Habit, HabitId, PauseReason } from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";
import type {
  HabitNotificationPlan,
  NotificationScheduler,
} from "@/domain/services/NotificationScheduler";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toPlan(h: Habit): HabitNotificationPlan {
  return {
    habitId: h.id,
    name: h.name,
    icon: h.icon,
    startTime: h.startTime ?? h.time ?? "08:00",
    schedule: h.schedule as any,
    reminderOffsetMinutes: h.reminderOffsetMinutes ?? null,
  };
}

export class SetHabitPaused {
  constructor(
    private habitRepository: HabitRepository,
    private notificationScheduler: NotificationScheduler
  ) {}

  async execute(input: {
    id: HabitId;
    paused: boolean;
    reason?: PauseReason;
  }): Promise<void> {
    const habit = await this.habitRepository.getById(input.id);
    if (!habit) return;

    const nextPaused = !!input.paused;
    const reason: PauseReason = input.reason ?? "manual";

    // 1) Cancela IDs actuales
    const existingIds = Array.isArray(habit.notificationIds)
      ? habit.notificationIds
      : [];

    if (existingIds.length) {
      try {
        await this.notificationScheduler.cancel(existingIds);
      } catch (e) {
        console.warn("[SetHabitPaused] cancel failed", e);
      }
    }

    // 2) Persistir pausa + limpiar ids
    const updated: Habit = {
      ...habit,
      isPaused: nextPaused,
      pausedAt: nextPaused ? todayISO() : null,
      pauseReason: nextPaused ? reason : null,
      notificationIds: [],
    };

    await this.habitRepository.update(updated);
    await this.habitRepository.updateNotifications(updated.id, []);

    if (nextPaused) return;

    // 3) Reanudar: agendar próximas ocurrencias (por defecto 30 días)
    const plan = toPlan(updated);
    const ids = await this.notificationScheduler.scheduleForHabit(plan, {
      horizonDays: 30,
    });

    updated.notificationIds = ids;
    await this.habitRepository.updateNotifications(updated.id, ids);
    await this.habitRepository.update(updated);
  }
}
