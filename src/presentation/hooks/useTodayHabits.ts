// src/presentation/hooks/useTodayHabits.ts
import { container } from "@/core/di/container";
import { ReviewService } from "@/core/ReviewService";
import { isHabitDueToday } from "@/domain/services/habitDue"; // ✅ NUEVO
import type { TimeOfDay } from "@/utils/timeOfDay";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Fecha LOCAL YYYY-MM-DD */
const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
};

function todayLocalDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export type FrequencyType = "daily" | "weekly" | "monthly";

export type TodayHabitVM = {
  id: string;
  name: string;
  done: boolean;
  color: string;
  icon: string;
  scheduleType: FrequencyType;
  timeOfDay?: TimeOfDay;
  mode?: "puntual" | "bloque";
  progress?: number;
  targetRepeats?: number;

  startTime?: string | null;
  endTime?: string | null;
  time?: string | null; // legacy
  timeBlocks?: Array<{ startTime: string; endTime: string }> | null;
};

function getScheduleType(habit: any): FrequencyType {
  const t = habit?.schedule?.type;
  if (t === "weekly" || t === "monthly") return t;
  return "daily";
}

function hhmmToMinutes(hhmm?: string | null): number {
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

    const dateStr = todayStr();
    const today = todayLocalDate();

    // ⚠️ Si este caso de uso ya filtra "hoy", no pasa nada: el filter será redundante.
    const result = await container.getTodayHabits.execute(dateStr);
    // result: [{ habit, done }]

    const mapped: TodayHabitVM[] = result
      // ✅ ENCHUFE: filtra por schedule + endCondition
      .filter(({ habit }: any) => isHabitDueToday(habit, today))
      .map(({ habit, done, progress }: any) => {
        return {
          id: habit.id,
          name: habit.name,
          color: habit.color,
          icon: habit.icon,
          done,
          progress: progress ?? 0,
          targetRepeats: habit.targetRepeats ?? 1,
          scheduleType: getScheduleType(habit),
          timeOfDay: habit.timeOfDay,
          mode: habit.mode ?? "bloque",

          startTime: habit.startTime ?? null,
          endTime: habit.endTime ?? null,
          time: habit.time ?? null,
          timeBlocks: habit.timeBlocks ?? null,
        };
      });

    // orden por startTime
    mapped.sort(
      (a, b) =>
        hhmmToMinutes(a.startTime ?? a.time) -
        hhmmToMinutes(b.startTime ?? b.time)
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
      return () => {};
    }, [load])
  );

  async function toggle(id: string) {
    const dateStr = todayStr();
    const habit = habits.find((h) => h.id === id);
    
    if (!habit) return;

    const targetRepeats = habit.targetRepeats ?? 1;
    const currentProgress = habit.progress ?? 0;
    const isCompleted = currentProgress >= targetRepeats;

    // Si el hábito ya está completado (progress >= targetRepeats), volver a pendientes
    if (isCompleted) {
      // Usar toggle tradicional para volver a pendientes (resetear progress a 0)
      await container.toggleHabitForDate.execute({
        habitId: id,
        date: dateStr,
      });
    } else {
      // Si no está completado, incrementar progreso
      await container.incrementHabitProgress.execute({
        habitId: id,
        date: dateStr,
      });

      // Verificar si el hábito quedó completado después del incremento
      const newProgress = currentProgress + 1;
      const isNowCompleted = newProgress >= targetRepeats;

      if (isNowCompleted) {
        // Obtener la racha del hábito de forma asíncrona (no bloquea la UI)
        container.getHabitStreaks.execute(id).then((streaks) => {
          if (streaks.currentDailyStreak >= 3) {
            ReviewService.triggerReviewFlow();
          }
        }).catch(() => {
          // Silenciar errores para no romper la UX
        });
      }
    }
    
    await load();
  }

  return { loading, habits, toggle, refresh: load };
}
