// src/presentation/hooks/useTodayHabits.ts
import { container } from "@/core/di/container";
import { TimeOfDay } from "@/utils/timeOfDay";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

const todayStr = () => new Date().toISOString().slice(0, 10);


export type TodayHabitVM = {
  id: string;
  name: string;
  done: boolean;
  color: string;
  icon: string;
  timeOfDay?: TimeOfDay;
};

export function useTodayHabits() {
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<TodayHabitVM[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await container.getTodayHabits.execute(todayStr());

    setHabits(
      result.map(({ habit, done }: any) => ({
        id: habit.id,
        name: habit.name,
        color: habit.color,
        icon: habit.icon,
        done,
        timeOfDay: habit.timeOfDay,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
