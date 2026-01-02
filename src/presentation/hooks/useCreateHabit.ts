import { scheduleHabitReminder } from "@/core/notifications/notifications";
import { SqliteHabitRepository } from "@/data/sqlite/SqliteHabitRepository";
import type {
  EndCondition,
  HabitSchedule,
  TimeOfDay,
} from "@/domain/entities/Habit";
import { CreateHabit } from "@/domain/usecases/CreateHabit";
import { useCallback, useState } from "react";

const habitRepository = new SqliteHabitRepository();
const createHabitUseCase = new CreateHabit(habitRepository);

export type CreateHabitFormInput = {
  name: string;
  color: string;
  icon: string;
  type: "daily" | "weekly";

  startTime: string; // "HH:mm"
  endTime?: string; // opcional

  weeklyDays?: number[];
  reminderOffsetMinutes?: number | null;
};

function inferTimeOfDayFromTime(time: string): TimeOfDay {
  const hour = Number(time.split(":")[0]) || 0;
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function buildSchedule(
  type: "daily" | "weekly",
  weeklyDays?: number[]
): HabitSchedule {
  if (type === "daily") {
    return { type: "daily", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
  }

  const today = new Date().getDay();
  return {
    type: "weekly",
    daysOfWeek: weeklyDays?.length ? weeklyDays : [today],
  };
}

function parseTime(time: string) {
  const [h, m] = time.split(":");
  return {
    hour: Number(h) || 0,
    minute: Number(m) || 0,
  };
}

export function useCreateHabit() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (input: CreateHabitFormInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const schedule = buildSchedule(input.type, input.weeklyDays);
      const endCondition: EndCondition = { type: "none" };
      const timeOfDay = inferTimeOfDayFromTime(input.startTime);

      const habit = await createHabitUseCase.execute({
        name: input.name,
        color: input.color,
        icon: input.icon,
        schedule,
        endCondition,
        timeOfDay,
        startTime: input.startTime,
        endTime: input.endTime,
        reminderOffsetMinutes: input.reminderOffsetMinutes ?? null,
      });

      // 🔔 Programar notificación
      if (input.reminderOffsetMinutes != null) {
        const { hour, minute } = parseTime(input.startTime);
        await scheduleHabitReminder({
          habitId: habit.id,
          habitName: habit.name,
          hour,
          minute,
          offsetMinutes: input.reminderOffsetMinutes,
        });
      }

      setIsLoading(false);
      return { ok: true as const, habit };
    } catch (e) {
      const err = e as Error;
      setError(err);
      setIsLoading(false);
      return { ok: false as const, error: err };
    }
  }, []);

  return { create, isLoading, error };
}
