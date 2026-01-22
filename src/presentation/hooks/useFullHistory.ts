// src/presentation/hooks/useFullHistory.ts
import { container } from "@/core/di/container";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FullHistory } from "@/domain/usecases/GetFullHistory";

/**
 * Hook para obtener historial completo con paginación lazy loading.
 * 
 * El histórico es "Smart & Clean":
 * - Comienza desde el primer registro real (MIN(date) en habit_logs)
 * - No muestra días anteriores al primer check del usuario
 * - Si no hay registros, muestra solo la semana actual
 * 
 * Carga los últimos 3 meses inicialmente para performance, luego carga más al hacer scroll hacia atrás.
 * Sin límites: el usuario puede ver todo su historial completo desde el primer día.
 */

// Helper para obtener fecha hace N meses
function getDateMonthsAgo(monthsAgo: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Helper para obtener primer día del mes
function getFirstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

// Helper para obtener último día del mes
function getLastDayOfMonth(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function useFullHistory() {
  const [history, setHistory] = useState<FullHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar últimos 3 meses inicialmente
  const initialMonths = 3;
  const today = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const initialFromDate = useMemo(
    () => getDateMonthsAgo(initialMonths),
    [initialMonths]
  );

  const [loadedUntilDate, setLoadedUntilDate] = useState<string>(initialFromDate);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // No pasar fromDate para que el use case obtenga automáticamente la fecha mínima (MIN(date))
      // Para performance, cargamos inicialmente solo los últimos 3 meses
      // El use case se asegurará de que no sea anterior al primer registro real
      const result = await container.getFullHistory.execute({
        fromDate: initialFromDate, // Últimos 3 meses para carga inicial rápida
        toDate: today,
      });

      setHistory(result);
      
      // Guardar la fecha mínima real para el lazy loading
      // Si el resultado tiene meses, usar el último mes como referencia
      if (result.months.length > 0) {
        const lastMonth = result.months[result.months.length - 1];
        const lastMonthFirstDay = `${lastMonth.year}-${String(lastMonth.month).padStart(2, "0")}-01`;
        setLoadedUntilDate(lastMonthFirstDay);
      } else {
        setLoadedUntilDate(initialFromDate);
      }
    } catch (e) {
      console.error("[useFullHistory] loadInitial failed", e);
      setError("No se pudo cargar el historial.");
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }, [initialFromDate, today]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !history) return;

    // Calcular fecha desde la cual cargar más (3 meses antes de loadedUntilDate)
    const [year, month] = loadedUntilDate.split("-").map(Number);

    // Retroceder 3 meses
    let newYear = year;
    let newMonth = month - 3;
    if (newMonth <= 0) {
      newMonth = 12 + newMonth;
      newYear = year - 1;
    }

    const newFromDate = getFirstDayOfMonth(newYear, newMonth);
    // El toDate es el último día del mes anterior a loadedUntilDate
    const prevMonth = month - 1;
    let prevYear = year;
    let finalPrevMonth = prevMonth;
    if (prevMonth <= 0) {
      finalPrevMonth = 12;
      prevYear = year - 1;
    }
    const newToDate = getLastDayOfMonth(prevYear, finalPrevMonth);

    setLoadingMore(true);

    try {
      // No pasar fromDate para que el use case obtenga automáticamente la fecha mínima
      // si newFromDate es anterior a la fecha mínima real
      const result = await container.getFullHistory.execute({
        fromDate: newFromDate,
        toDate: newToDate,
      });

      // Combinar con historial existente
      setHistory((prev) => {
        if (!prev) return result;

        // Combinar meses, evitando duplicados
        const existingMonthKeys = new Set(
          prev.months.map((m) => `${m.year}-${m.month}`)
        );

        const newMonths = result.months.filter(
          (m) => !existingMonthKeys.has(`${m.year}-${m.month}`)
        );

        return {
          months: [...prev.months, ...newMonths].sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          }),
          totalMonths: prev.totalMonths + newMonths.length,
        };
      });

      setLoadedUntilDate(newFromDate);
    } catch (e) {
      console.error("[useFullHistory] loadMore failed", e);
      // No mostrar error al usuario, solo log
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, history, loadedUntilDate]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  return {
    history,
    loading,
    loadingMore,
    error,
    loadMore,
    reload: loadInitial,
  };
}
