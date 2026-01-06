// app/presentation/hooks/useWeeklySummary.ts
import { container } from "@/core/di/container";
import { useCallback, useEffect, useState } from "react";

export type DaySummary = {
  date: string; // "YYYY-MM-DD"
  label: string;
  totalPlanned: number;
  totalDone: number;
  completionRate: number; // 0..1
};

/**
 * YYYY-MM-DD en hora local (evita bugs por UTC con toISOString)
 */
function todayLocalYMD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useWeeklySummary() {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await container.getWeeklySummary.execute(todayLocalYMD());

      // Tip: si quieres, aquí puedes normalizar/clamp completionRate,
      // pero ideal que el usecase ya venga correcto.
      setDays(result);
    } catch (e) {
      console.error("[useWeeklySummary] load failed", e);
      setDays([]);
      setError("No se pudieron cargar las estadísticas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, days, reload: load, error };
}
