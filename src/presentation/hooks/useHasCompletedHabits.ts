// src/presentation/hooks/useHasCompletedHabits.ts
import { container } from "@/core/di/container";
import { useCallback, useEffect, useState } from "react";

/**
 * Hook para verificar si el usuario ha completado algún hábito alguna vez.
 * Esto es útil para determinar si mostrar el empty state o no.
 */
export function useHasCompletedHabits() {
  const [hasCompleted, setHasCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      // Obtener todos los hábitos
      const habits = await container.getAllHabits.execute();
      
      if (habits.length === 0) {
        setHasCompleted(false);
        return;
      }

      // Verificar si algún hábito tiene logs completados
      // Un log está completado si done=true o progress >= targetRepeats
      let foundCompleted = false;
      
      for (const habit of habits) {
        const logs = await container.habitLogRepository.getLogsForHabit(habit.id);
        const targetRepeats = habit.targetRepeats ?? 1;
        
        const hasCompletedLog = logs.some((log) => {
          if (log.progress !== undefined) {
            return log.progress >= targetRepeats;
          }
          return log.done;
        });
        
        if (hasCompletedLog) {
          foundCompleted = true;
          break;
        }
      }
      
      setHasCompleted(foundCompleted);
    } catch (error) {
      console.warn("[useHasCompletedHabits] Error:", error);
      setHasCompleted(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return { hasCompleted, loading, refresh: check };
}

/**
 * Hook para obtener la fecha del primer hábito completado.
 * Retorna null si nunca ha completado un hábito.
 */
export function useFirstCompletedHabitDate() {
  const [firstDate, setFirstDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      // Obtener todos los hábitos
      const habits = await container.getAllHabits.execute();
      
      if (habits.length === 0) {
        setFirstDate(null);
        return;
      }

      // Buscar la fecha más temprana de cualquier log completado
      let earliestDate: string | null = null;
      
      for (const habit of habits) {
        const logs = await container.habitLogRepository.getLogsForHabit(habit.id);
        const targetRepeats = habit.targetRepeats ?? 1;
        
        const completedLogs = logs.filter((log) => {
          if (log.progress !== undefined) {
            return log.progress >= targetRepeats;
          }
          return log.done;
        });
        
        for (const log of completedLogs) {
          if (!earliestDate || log.date < earliestDate) {
            earliestDate = log.date;
          }
        }
      }
      
      setFirstDate(earliestDate);
    } catch (error) {
      console.warn("[useFirstCompletedHabitDate] Error:", error);
      setFirstDate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return { firstDate, loading, refresh: check };
}
