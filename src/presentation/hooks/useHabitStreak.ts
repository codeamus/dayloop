// src/presentation/hooks/useHabitStreak.ts
import { container } from "@/core/di/container";
import type { HabitId } from "@/domain/entities/Habit";
import type { HabitStreak } from "@/domain/usecases/GetHabitStreaks";
import { useEffect, useState } from "react";

export function useHabitStreak(habitId: HabitId | undefined) {
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<HabitStreak | null>(null);

  useEffect(() => {
    if (!habitId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      const res = await container.getHabitStreaks.execute(habitId);
      if (!cancelled) {
        setStreak(res);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [habitId]);

  return { loading, streak };
}
