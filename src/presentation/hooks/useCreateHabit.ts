// src/presentation/hooks/useCreateHabit.ts
import { container } from "@/core/di/container";
import { rescheduleHabitNotificationsForHabit } from "@/core/notifications/notifications";
import type { Habit } from "@/domain/entities/Habit";

type CreateHabitInput = {
  name: string;
  icon: string;
  color: string;
  type: "daily" | "weekly" | "monthly";
  startTime?: string;
  endTime?: string;
  weeklyDays?: number[];
  monthDays?: number[];
  reminderOffsetMinutes?: number | null;
  date?: string;
};

export function useCreateHabit() {
  async function create(
    input: CreateHabitInput
  ): Promise<{ ok: true; habit: Habit } | { ok: false }> {
    // 1) crear hábito + (CreateHabit ya agenda y guarda notificationIds)
    const result = await container.createHabit.execute({
      name: input.name,
      icon: input.icon,
      color: input.color,
      type: input.type,
      startTime: input.startTime,
      endTime: input.endTime,
      weeklyDays: input.weeklyDays,
      monthDays: input.monthDays,
      reminderOffsetMinutes: input.reminderOffsetMinutes,
      date: input.date,
    });

    if (!result || !result.ok) return { ok: false };

    const habit = result.habit;

    // 2) ✅ blindaje: cancelar fantasma + re-agendar según schedule weekly/monthly
    // Solo si el user quiere recordatorio (null = sin recordatorio)
    // OJO: esto también deja limpio si reminderOffsetMinutes es null.
    await rescheduleHabitNotificationsForHabit(habit, { horizonDays: 30 });

    return { ok: true, habit };
  }

  return { create };
}
