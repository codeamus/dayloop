// src/presentation/hooks/useCreateHabit.ts
import { SqliteHabitRepository } from "@/data/sqlite/SqliteHabitRepository";
import type {
     EndCondition,
     Habit,
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
  icon: string; // emoji
  type: "daily" | "weekly";
  time: string; // "HH:mm"
  weeklyDays?: number[]; // 0–6 (Domingo–Sábado, como Date.getDay)
};

function inferTimeOfDayFromTime(time: string): TimeOfDay {
  const [hStr] = time.split(":");
  const hour = Number(hStr) || 0;

  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function buildSchedule(
  type: "daily" | "weekly",
  weeklyDays?: number[]
): HabitSchedule {
  const todayIndex = new Date().getDay(); // 0-6

  if (type === "daily") {
    // Hábito todos los días
    return { type: "daily", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
  }

  const days = weeklyDays && weeklyDays.length > 0 ? weeklyDays : [todayIndex];

  return { type: "weekly", daysOfWeek: days };
}

export function useCreateHabit() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (input: CreateHabitFormInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const schedule: HabitSchedule = buildSchedule(
        input.type,
        input.weeklyDays
      );
      const endCondition: EndCondition = { type: "none" };
      const timeOfDay: TimeOfDay = inferTimeOfDayFromTime(input.time);

      const habit: Habit = await createHabitUseCase.execute({
        name: input.name,
        color: input.color,
        icon: input.icon,
        schedule,
        endCondition,
        timeOfDay,
        time: input.time,
      });

      setIsLoading(false);
      return { ok: true as const, habit };
    } catch (e) {
      const err = e as Error;
      console.error("Error creando hábito:", err);
      setIsLoading(false);
      setError(err);
      return { ok: false as const, error: err };
    }
  }, []);

  return { create, isLoading, error };
}
