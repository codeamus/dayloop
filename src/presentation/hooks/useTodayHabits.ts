// src/presentation/hooks/useTodayHabits.ts
import { container } from "@/core/di/container";
import { TimeOfDay } from "@/utils/timeOfDay";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * ✅ Fecha LOCAL en formato YYYY-MM-DD
 * (evita el bug de UTC con toISOString() que puede cambiar el día en Chile)
 */
const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
};

export type FrequencyType = "daily" | "weekly" | "monthly";

export type TodayHabitVM = {
  id: string;
  name: string;
  done: boolean;
  color: string;
  icon: string;
  scheduleType: FrequencyType;
  timeOfDay?: TimeOfDay;

  // ✅ NUEVO
  startTime?: string | null;
  endTime?: string | null;

  // ⚠️ legacy opcional
  time?: string | null;
};


function getScheduleType(habit: any): FrequencyType {
  const t = habit?.schedule?.type;
  if (t === "weekly" || t === "monthly") return t;
  return "daily";
}

function hhmmToMinutes(hhmm?: string): number {
  if (!hhmm) return Number.POSITIVE_INFINITY;
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m))
    return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.min(23, h)) * 60 + Math.max(0, Math.min(59, m));
}

export function useTodayHabits() {
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<TodayHabitVM[]>([]);

  const load = useCallback(async () => {
    setLoading(true);

    const date = todayStr();
    const result = await container.getTodayHabits.execute(date);
    // result: [{ habit, done }]

    const mapped: TodayHabitVM[] = result.map(({ habit, done }: any) => {
      return {
        id: habit.id,
        name: habit.name,
        color: habit.color,
        icon: habit.icon,
        done,
        scheduleType: getScheduleType(habit),
        timeOfDay: habit.timeOfDay,

        // ✅ NUEVO
        startTime: habit.startTime ?? null,
        endTime: habit.endTime ?? null,

        // ⚠️ legacy
        time: habit.time ?? null,
      };
    });


    // ✅ orden por startTime para que Home salga “por horario”
    mapped.sort(
      (a, b) => hhmmToMinutes(a.startTime) - hhmmToMinutes(b.startTime)
    );

    setHabits(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function toggle(id: string) {
    const date = todayStr();
    await container.toggleHabitForToday.execute(id, date);
    await load();
  }

  return {
    loading,
    habits,
    toggle,
    refresh: load,
  };
}
