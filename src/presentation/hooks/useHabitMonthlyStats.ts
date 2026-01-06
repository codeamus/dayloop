// src/presentation/hooks/useHabitMonthlyStats.ts
import { container } from "@/core/di/container";
import type { MonthlyStats } from "@/domain/usecases/GetHabitMonthlyStats";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Hook para stats mensuales del hábito.
 *
 * ✅ Anti-crash:
 * - El nombre del usecase en el container puede variar.
 * - Si no existe, NO rompe la app; deja stats en null y loguea warning.
 */
function clampYearMonth(input: { year: number; month: number }) {
  let { year, month } = input;
  if (month < 1) return { year: year - 1, month: 12 };
  if (month > 12) return { year: year + 1, month: 1 };
  return { year, month };
}

type ExecuteArgs = { habitId: string; year: number; month: number };

type MonthlyUsecase = {
  execute: (args: ExecuteArgs) => Promise<MonthlyStats>;
};

function resolveMonthlyUsecase(): MonthlyUsecase | null {
  const c: any = container as any;

  // Probamos nombres típicos (ajusta/añade si quieres)
  const candidates = [
    c.getHabitMonthlyStats,
    c.GetHabitMonthlyStats,
    c.habitMonthlyStats,
    c.monthlyStats,
    c.getMonthlyStats,
  ].filter(Boolean);

  const uc = candidates.find((x: any) => x && typeof x.execute === "function");
  return uc ?? null;
}

export function useHabitMonthlyStats(habitId?: string) {
  const now = useMemo(() => new Date(), []);
  const [ym, setYm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(false);

  const usecase = useMemo(() => resolveMonthlyUsecase(), []);

  const execute = useCallback(async () => {
    if (!habitId) return;

    if (!usecase) {
      // No crashear: avisar y salir
      console.warn(
        "[useHabitMonthlyStats] No encontré el usecase en container. " +
          "Revisa core/di/container.ts (debería exponer algo como getHabitMonthlyStats)."
      );
      setStats(null);
      return;
    }

    setLoading(true);
    try {
      const res = await usecase.execute({
        habitId,
        year: ym.year,
        month: ym.month,
      });
      setStats(res);
    } finally {
      setLoading(false);
    }
  }, [habitId, ym.year, ym.month, usecase]);

  useEffect(() => {
    void execute();
  }, [execute]);

  const prevMonth = useCallback(() => {
    setYm((p) => clampYearMonth({ year: p.year, month: p.month - 1 }));
  }, []);

  const nextMonth = useCallback(() => {
    setYm((p) => clampYearMonth({ year: p.year, month: p.month + 1 }));
  }, []);

  const refresh = useCallback(async () => {
    await execute();
  }, [execute]);

  return {
    ym,
    stats,
    loading,
    prevMonth,
    nextMonth,
    refresh,
    setYm,
  };
}
