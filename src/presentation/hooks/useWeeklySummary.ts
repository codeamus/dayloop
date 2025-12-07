import { container } from "@/core/di/container";
import { useCallback, useEffect, useState } from "react";

type DaySummary = {
  date: string;
  label: string;
  totalPlanned: number;
  totalDone: number;
  completionRate: number;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export function useWeeklySummary() {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DaySummary[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await container.getWeeklySummary.execute(todayStr());
    setDays(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, days, reload: load };
}
