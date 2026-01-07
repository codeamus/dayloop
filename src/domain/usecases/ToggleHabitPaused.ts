// src/domain/usecases/ToggleHabitPaused.ts

import type { Habit, HabitId } from "@/domain/entities/Habit";
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

function isEnded(h: Habit, today: string): boolean {
  const ec = h.endCondition;
  if (!ec || ec.type === "none") return false;
  if (ec.type === "byDate") return ec.endDate < today;
  return false;
}

export class ToggleHabitPaused {
  constructor(
    private habitRepository: HabitRepository,
    private notificationScheduler: NotificationScheduler
  ) {}

  async execute(id: HabitId, nextPaused: boolean): Promise<void> {
    const habit = await this.habitRepository.getById(id);
    if (!habit) return;

    const today = todayISO();

    // ❌ Si el hábito ya terminó, no permitimos reanudar
    if (!nextPaused && isEnded(habit, today)) {
      // lo dejamos pausado por ended
      const forced: Habit = {
        ...habit,
        isPaused: true,
        pausedAt: habit.pausedAt ?? today,
        pauseReason: "ended",
      };
      await this.habitRepository.update(forced);
      return;
    }

    if (nextPaused) {
      // =============== PAUSAR ===============
      try {
        if (this.notificationScheduler.cancelByHabitId) {
          await this.notificationScheduler.cancelByHabitId(habit.id);
        }
      } catch (e) {
        console.warn("[ToggleHabitPaused] cancelByHabitId failed", e);
      }

      try {
        if (habit.notificationIds?.length) {
          await this.notificationScheduler.cancel(habit.notificationIds);
        }
      } catch (e) {
        console.warn("[ToggleHabitPaused] cancel(ids) failed", e);
      }

      await this.habitRepository.updateNotifications(habit.id, []);

      const updated: Habit = {
        ...habit,
        isPaused: true,
        pausedAt: today,
        pauseReason: "manual",
        notificationIds: [],
      };

      await this.habitRepository.update(updated);
      return;
    }

    // =============== REANUDAR ===============
    const unpaused: Habit = {
      ...habit,
      isPaused: false,
      pausedAt: null,
      pauseReason: null,
    };

    // actualiza primero el hábito (para que UI muestre activo)
    await this.habitRepository.update(unpaused);

    // reagendar
    const plan: HabitNotificationPlan = {
      habitId: unpaused.id,
      name: unpaused.name,
      icon: unpaused.icon,
      startTime: unpaused.startTime,
      schedule: unpaused.schedule as any,
      reminderOffsetMinutes: unpaused.reminderOffsetMinutes ?? null,
    };

    const ids = await this.notificationScheduler.scheduleForHabit(plan);

    unpaused.notificationIds = ids;
    await this.habitRepository.updateNotifications(unpaused.id, ids);
    await this.habitRepository.update(unpaused);
  }
}
