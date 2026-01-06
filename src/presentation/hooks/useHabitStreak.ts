import { container } from "@/core/di/container";
import type { HabitStreak } from "@/domain/entities/HabitLog";
import { useCallback, useEffect, useState } from "react";

export function useHabitStreak(habitId?: string) {
  const [streak, setStreak] = useState<HabitStreak | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!habitId) return;

    setLoading(true);
    try {
      const res = await container.getHabitStreaks.execute(habitId);
      setStreak({ habitId, ...res });
    } catch {
      // silencio: no rompemos UI por streaks
      setStreak(null);
    } finally {
      setLoading(false);
    }
  }, [habitId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { streak, loading, refresh };
}
