// src/presentation/hooks/useAllHabits.ts
import { container } from "@/core/di/container";
import type { Habit } from "@/domain/entities/Habit";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

export function useAllHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await container.getAllHabits.execute();
    setHabits(result);
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

  async function remove(id: string) {
    await container.deleteHabit.execute(id);
    await load();
  }

  async function setPaused(id: string, paused: boolean) {
    await container.setHabitPaused.execute({ id, paused, reason: "manual" });
    await load();
  }

  return {
    habits,
    loading,
    remove,
    setPaused,
    reload: load,
  };
}
