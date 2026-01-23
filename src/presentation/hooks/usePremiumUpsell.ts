// src/presentation/hooks/usePremiumUpsell.ts
import { container } from "@/core/di/container";
import {
  getHasSeen3DayStreakUpsell,
  setHasSeen3DayStreakUpsell,
} from "@/core/settings/premiumUpsellSettings";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook que detecta cuando el usuario alcanza una racha de 3 días
 * por primera vez y activa el flag para mostrar el upsell premium.
 *
 * Reglas:
 * - Solo se activa cuando se alcanza exactamente 3 días (no más, no menos)
 * - Solo se muestra una vez (persistido en AsyncStorage)
 * - La lógica de cálculo viene del domain (GetHabitStreaks)
 * - Se puede refrescar manualmente cuando se completa un hábito
 */
export function usePremiumUpsell() {
  const [shouldShowUpsell, setShouldShowUpsell] = useState(false);
  const [loading, setLoading] = useState(true);
  const checkingRef = useRef(false);

  const checkStreaks = useCallback(async () => {
    // Evitar múltiples checks simultáneos
    if (checkingRef.current) return;
    checkingRef.current = true;

    try {
      // Verificar si ya se mostró el upsell
      const hasSeen = await getHasSeen3DayStreakUpsell();
      if (hasSeen) {
        setShouldShowUpsell(false);
        setLoading(false);
        checkingRef.current = false;
        return;
      }

      // Obtener todos los hábitos
      const habits = await container.getAllHabits.execute();
      if (habits.length === 0) {
        setShouldShowUpsell(false);
        setLoading(false);
        checkingRef.current = false;
        return;
      }

      // Verificar streaks de todos los hábitos
      let found3DayStreak = false;

      for (const habit of habits) {
        try {
          const streaks = await container.getHabitStreaks.execute(habit.id);

          // Detectar si alcanzó exactamente 3 días por primera vez
          // (currentDailyStreak === 3 significa que acaba de completar el día 3)
          if (streaks.currentDailyStreak === 3) {
            found3DayStreak = true;
            break;
          }
        } catch {
          // Si falla el cálculo de un hábito, continuar con los demás
          continue;
        }
      }

      if (found3DayStreak) {
        setShouldShowUpsell(true);
        // Marcar como visto inmediatamente para evitar múltiples triggers
        await setHasSeen3DayStreakUpsell(true);
      } else {
        setShouldShowUpsell(false);
      }
    } catch (error) {
      console.error("[usePremiumUpsell] Error checking streaks:", error);
      setShouldShowUpsell(false);
    } finally {
      setLoading(false);
      checkingRef.current = false;
    }
  }, []);

  const dismissUpsell = useCallback(async () => {
    setShouldShowUpsell(false);
    await setHasSeen3DayStreakUpsell(true);
  }, []);

  useEffect(() => {
    void checkStreaks();
  }, [checkStreaks]);

  return {
    shouldShowUpsell,
    loading,
    dismissUpsell,
    refresh: checkStreaks,
  };
}
