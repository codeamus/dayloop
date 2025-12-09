// src/presentation/hooks/useTodayHabits.ts
import { container } from "@/core/di/container";
import { TimeOfDay } from "@/utils/timeOfDay";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

const todayStr = () => new Date().toISOString().slice(0, 10);

export type FrequencyType = "daily" | "weekly" | "monthly";

export type TodayHabitVM = {
  id: string;
  name: string;
  done: boolean;
  color: string;
  icon: string;
  scheduleType: FrequencyType;
  timeOfDay?: TimeOfDay;
};

function getScheduleType(habit: any): FrequencyType {
  const t = habit?.schedule?.type;
  if (t === "weekly" || t === "monthly") return t;
  return "daily";
}


export function useTodayHabits() {
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<TodayHabitVM[]>([]);

  const load = useCallback(async () => {
    setLoading(true);

    const result = await container.getTodayHabits.execute(todayStr());
    // result: [{ habit, done }]
    const mapped: TodayHabitVM[] = result.map(({ habit, done }: any) => {
      return {
        id: habit.id,
        name: habit.name,
        color: habit.color,
        icon: habit.icon,
        done,
        scheduleType: getScheduleType(habit),
        timeOfDay: habit.timeOfDay,
      };
    });

    setHabits(mapped);
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
