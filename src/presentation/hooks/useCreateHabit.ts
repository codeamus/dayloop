// src/presentation/hooks/useCreateHabit.ts
import { container } from "@/core/di/container";
import { scheduleHabitReminder } from "@/core/notifications/notifications";
import { addMinutesHHmm } from "@/utils/time";
import { useState } from "react";

type CreateHabitPayload = {
  name: string;
  color: string;
  icon: string;
  type: "daily" | "weekly" | "monthly";
  startTime?: string;
  endTime?: string;
  weeklyDays?: number[];
  monthlyDays?: number[]; // ✅ unificado
  reminderOffsetMinutes?: number | null; // null => sin recordatorio
};

function todayDayOfWeek(): number {
  return new Date().getDay(); // 0..6
}

function todayDayOfMonth(): number {
  return new Date().getDate(); // 1..31
}

function safeHHmm(v: any, fallback: string) {
  if (typeof v !== "string") return fallback;
  return /^\d{2}:\d{2}$/.test(v) ? v : fallback;
}

function safeNumArray(v: any): number[] {
  if (!Array.isArray(v)) return [];
  return v.map(Number).filter((n) => Number.isFinite(n));
}

function extractCreatedHabitId(result: any): string | null {
  // soporta varios retornos posibles
  if (!result) return null;
  if (typeof result === "string") return result;
  if (typeof result?.id === "string") return result.id;
  if (typeof result?.habit?.id === "string") return result.habit.id;
  if (typeof result?.data?.id === "string") return result.data.id;
  return null;
}

export function useCreateHabit() {
  const [isLoading, setIsLoading] = useState(false);

  async function create(payload: CreateHabitPayload) {
    try {
      setIsLoading(true);

      const startTime = safeHHmm(payload.startTime, "08:00");
      const endTime = safeHHmm(payload.endTime, addMinutesHHmm(startTime, 30));

      const weeklyDays = safeNumArray(payload.weeklyDays).map(Math.trunc);
      const monthlyDays = safeNumArray(payload.monthlyDays)
        .map((d) => Math.trunc(d))
        .filter((d) => d >= 1 && d <= 31);

      const type = payload.type;

      const reminderOffsetMinutes =
        payload.reminderOffsetMinutes === null ||
        payload.reminderOffsetMinutes === undefined
          ? null
          : Number(payload.reminderOffsetMinutes);

      const input = {
        name: payload.name.trim(),
        icon: payload.icon,
        color: payload.color,
        type,
        startTime,
        endTime,

        // ✅ SIEMPRE arrays
        weeklyDays:
          type === "weekly"
            ? weeklyDays.length
              ? weeklyDays
              : [todayDayOfWeek()]
            : [],

        monthlyDays:
          type === "monthly"
            ? monthlyDays.length
              ? monthlyDays
              : [todayDayOfMonth()]
            : [],

        // ✅ null significa “sin recordatorio”
        reminderOffsetMinutes,
      };

      const result = await container.createHabit.execute(input as any);

      // ✅ IMPORTANTE: asegúrate de sacar el habitId real
      const habitId = extractCreatedHabitId(result);

      if (habitId) {
        // 1) cancelar cualquier cosa previa (por si createHabit ya dejó algo)
        //    o si estás reusando IDs por error
        //    (aquí no tienes "habit.notificationIds" aún, así que cancela por hábito si ya lo tienes en result)
        //    Si no, omite este bloque en create (es más importante en update).

        if (reminderOffsetMinutes !== null) {
          const [hStr, mStr] = startTime.split(":");
          const hour = Number(hStr);
          const minute = Number(mStr);

          const scheduledId = await scheduleHabitReminder({
            habitId,
            habitName: input.name,
            hour,
            minute,
            offsetMinutes: reminderOffsetMinutes ?? 0,
          });

          if (scheduledId) {
            // ✅ Guarda en DB el id REAL (para luego poder cancelarlo)
            await container.habitRepository.updateNotifications(
              habitId as any,
              [scheduledId]
            );
            // si no tienes ese acceso directo, crea un usecase UpdateHabitNotifications
          }
        }
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  }

  return { create, isLoading };
}
