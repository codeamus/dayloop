// src/presentation/hooks/useTodayHabits.ts
import { container } from "@/core/di/container";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

const todayStr = () => new Date().toISOString().slice(0, 10);

export type FrequencyType = "daily" | "weekly" | "monthly";
export type TimeOfDay = "morning" | "afternoon" | "evening";

export type TodayHabitVM = {
  id: string;
  name: string;
  done: boolean;
  color: string;
  icon: string;
  // NUEVO
  scheduleType: FrequencyType;
  timeOfDay?: TimeOfDay;
};

function getScheduleType(habit: any): FrequencyType {
  const t = habit?.schedule?.type;
  if (t === "weekly" || t === "monthly") return t;
  return "daily"; // fallback por si viene undefined o cualquier otra cosa
}

function getTimeOfDay(habit: any): TimeOfDay | undefined {
  // si aún no tienes este campo en DB, no pasa nada: será undefined
  const slot = habit?.timeOfDay;
  if (slot === "morning" || slot === "afternoon" || slot === "evening") {
    return slot;
  }
  return undefined;
}

export function useTodayHabits() {
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<TodayHabitVM[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await container.getTodayHabits.execute(todayStr());

    // result = [{ habit, done }]
    const mapped: TodayHabitVM[] = result.map(({ habit, done }: any) => ({
      id: habit.id,
      name: habit.name,
      color: habit.color,
      icon: habit.icon,
      done,
      scheduleType: getScheduleType(habit),
      timeOfDay: getTimeOfDay(habit),
    }));

    setHabits(mapped);
    setLoading(false);
  }, []);

  // 1) Carga inicial
  useEffect(() => {
    load();
  }, [load]);

  // 2) Re-cargar cada vez que la pantalla vuelve a foco
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function toggle(id: string) {
    await container.toggleHabitForToday.execute(id, todayStr());
    await load();
  }

  return {
    loading,
    habits,
    toggle,
    refresh: load,
  };
}
