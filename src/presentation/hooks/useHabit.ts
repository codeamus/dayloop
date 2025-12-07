import { container } from "@/core/di/container";
import type { Habit } from "@/domain/entities/Habit";
import { useEffect, useState } from "react";

export function useHabit(id: string) {
  const [habit, setHabit] = useState<Habit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      const result = await container.habitRepository.getById(id);
      if (mounted) {
        setHabit(result);
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [id]);

  async function save(updated: Habit) {
    await container.updateHabit.execute(updated);
    setHabit(updated);
  }

  return {
    habit,
    loading,
    save,
  };
}
