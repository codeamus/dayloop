// src/presentation/hooks/useToggleHabitForDate.ts
import { container } from "@/core/di/container";
import { useCallback, useState } from "react";

export function useToggleHabitForDate(habitId?: string) {
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(
    async (date: string) => {
      if (!habitId) return;
      setLoading(true);
      try {
        await container.toggleHabitForDate.execute({ habitId, date });
      } finally {
        setLoading(false);
      }
    },
    [habitId]
  );

  return { toggle, loading };
}
