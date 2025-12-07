import { container } from "@/core/di/container";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

const todayStr = () => new Date().toISOString().slice(0, 10);

export function useTodayHabits() {
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<
    { id: string; name: string; done: boolean; color: string; icon: string }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await container.getTodayHabits.execute(todayStr());
    setHabits(
      result.map(({ habit, done }) => ({
        id: habit.id,
        name: habit.name,
        color: habit.color,
        icon: habit.icon,
        done,
      }))
    );
    setLoading(false);
  }, []);

  // 1) Carga inicial (primer render)
  useEffect(() => {
    load();
  }, [load]);

  // 2) Re-cargar cada vez que la pantalla vuelve a estar en foco
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
