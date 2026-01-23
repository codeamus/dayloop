// src/presentation/hooks/useWeeklySummary.ts
import { container } from "@/core/di/container";
import { useCallback, useEffect, useMemo, useState } from "react";

export type DaySummary = {
  date: string; // "YYYY-MM-DD"
  label: string; // "Lun"... "Dom"
  totalPlanned: number;
  totalDone: number;
  completionRate: number; // 0..1
};

export type WeekPreset = "current" | "previous";

/**
 * YYYY-MM-DD en hora local (evita bugs UTC).
 */
function formatLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Date local al mediodía (evita problemas DST).
 */
function todayLocalNoon(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

function addDaysLocalNoon(base: Date, deltaDays: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + deltaDays);
  d.setHours(12, 0, 0, 0);
  return d;
}

export function useWeeklySummary(
  preset: WeekPreset | string
) {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  // referencia para el usecase (hoy, hoy-7, o fecha personalizada)
  const referenceDate = useMemo(() => {
    // Si es una fecha personalizada (formato YYYY-MM-DD), usarla directamente
    if (typeof preset === "string" && /^\d{4}-\d{2}-\d{2}$/.test(preset)) {
      return preset;
    }
    
    // Si es un preset, calcular la fecha
    const base = todayLocalNoon();
    const ref = preset === "previous" ? addDaysLocalNoon(base, -7) : base;
    return formatLocalYMD(ref);
  }, [preset]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await container.getWeeklySummary.execute(referenceDate);
      setDays(result);
    } catch (e) {
      console.error("[useWeeklySummary] load failed", e);
      setDays([]);
      setError("No se pudieron cargar las estadísticas.");
    } finally {
      setLoading(false);
    }
  }, [referenceDate]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, days, error, reload: load, referenceDate };
}
