// src/presentation/hooks/useCreateHabit.ts
import { container } from "@/core/di/container";
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
  monthDays?: number[]; // 1..31
  reminderOffsetMinutes?: number | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayDayOfWeek(): number {
  const d = new Date();
  return d.getDay(); // 0..6
}

function todayDayOfMonth(): number {
  const d = new Date();
  return d.getDate(); // 1..31
}

function safeHHmm(v: any, fallback: string) {
  if (typeof v !== "string") return fallback;
  return /^\d{2}:\d{2}$/.test(v) ? v : fallback;
}

function safeNumArray(v: any): number[] {
  if (!Array.isArray(v)) return [];
  return v.map(Number).filter((n) => Number.isFinite(n));
}

export function useCreateHabit() {
  const [isLoading, setIsLoading] = useState(false);

  async function create(payload: CreateHabitPayload) {
    try {
      setIsLoading(true);

      const startTime = safeHHmm(payload.startTime, "08:00");
      const endTime = safeHHmm(payload.endTime, addMinutesHHmm(startTime, 30));

      const weeklyDays = safeNumArray(payload.weeklyDays);
      const monthDays = safeNumArray(payload.monthDays)
        .map((d) => Math.trunc(d))
        .filter((d) => d >= 1 && d <= 31);

      const type = payload.type;

      const input = {
        name: payload.name,
        icon: payload.icon,
        color: payload.color,
        type,

        startTime,
        endTime,

        // ✅ SIEMPRE mandamos arrays aunque estén vacíos (evita undefined.includes)
        weeklyDays:
          type === "weekly"
            ? weeklyDays.length
              ? weeklyDays
              : [todayDayOfWeek()]
            : [],

        monthDays:
          type === "monthly"
            ? monthDays.length
              ? monthDays
              : [todayDayOfMonth()]
            : [],

        reminderOffsetMinutes: payload.reminderOffsetMinutes ?? 0,
      };

      const result = await container.createHabit.execute(input as any);
      return result;
    } finally {
      setIsLoading(false);
    }
  }

  return { create, isLoading };
}
