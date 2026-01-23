// src/presentation/hooks/useGlobalStreaks.ts
import { container } from "@/core/di/container";
import { useCallback, useEffect, useState } from "react";

export type GlobalStreaks = {
  currentDailyStreak: number;
  bestDailyStreak: number;
};

export function useGlobalStreaks() {
  const [streaks, setStreaks] = useState<GlobalStreaks>({
    currentDailyStreak: 0,
    bestDailyStreak: 0,
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const habits = await container.getAllHabits.execute();
      
      if (habits.length === 0) {
        setStreaks({ currentDailyStreak: 0, bestDailyStreak: 0 });
        return;
      }

      // Obtener rachas de todos los hábitos
      const allStreaks = await Promise.all(
        habits.map((habit) => container.getHabitStreaks.execute(habit.id))
      );

      // Calcular racha global: usar la racha más larga entre todos los hábitos
      // Esto es más motivador y refleja mejor el progreso del usuario
      const currentStreaks = allStreaks.map((s) => s.currentDailyStreak);
      const bestStreaks = allStreaks.map((s) => s.bestDailyStreak);

      // Racha actual: máximo entre todos (la racha más larga que tiene actualmente)
      const currentDailyStreak = Math.max(...currentStreaks);

      // Mejor racha: máximo entre todos (la mejor racha histórica de cualquier hábito)
      const bestDailyStreak = Math.max(...bestStreaks);

      setStreaks({
        currentDailyStreak: currentDailyStreak || 0,
        bestDailyStreak: bestDailyStreak || 0,
      });
    } catch (error) {
      console.warn("[useGlobalStreaks] Error:", error);
      setStreaks({ currentDailyStreak: 0, bestDailyStreak: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { streaks, loading, refresh };
}
