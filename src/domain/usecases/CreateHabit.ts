// src/domain/usecases/CreateHabit.ts
import type { Habit } from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";
import { randomUUID } from "expo-crypto";

function addMinutesHHmm(time: string, add: number) {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;

  const total = (h * 60 + m + add) % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function isHHmm(v: string) {
  // "00:00" a "23:59"
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

export class CreateHabit {
  constructor(private habitRepository: HabitRepository) {}

  async execute(input: {
    name: string;
    color: string;
    icon: string;
    schedule: Habit["schedule"];
    endCondition: Habit["endCondition"];
    timeOfDay: Habit["timeOfDay"];

    // NUEVO
    startTime: Habit["startTime"];
    endTime?: Habit["endTime"]; // opcional, default +30

    reminderOffsetMinutes?: number;
  }) {
    const name = input.name.trim();
    if (!name) throw new Error("Habit name is required");

    const startTime = input.startTime;
    if (!isHHmm(startTime)) throw new Error("startTime inválido");

    const endTimeRaw = input.endTime ?? addMinutesHHmm(startTime, 30);
    const endTime = isHHmm(endTimeRaw)
      ? endTimeRaw
      : addMinutesHHmm(startTime, 30);

    // si por alguna razón queda igual, lo movemos +30
    const safeEndTime =
      endTime === startTime ? addMinutesHHmm(startTime, 30) : endTime;

    const habit: Habit = {
      id: randomUUID(),
      name,
      color: input.color,
      icon: input.icon,
      schedule: input.schedule,

      endCondition: input.endCondition ?? { type: "none" },

      // Bloque horario
      startTime,
      endTime: safeEndTime,

      // Legacy: mantenemos igual al startTime mientras migras
      time: startTime,

      timeOfDay: input.timeOfDay,

      calendarEventId: null,

      reminderOffsetMinutes:
        input.reminderOffsetMinutes != null
          ? input.reminderOffsetMinutes
          : null,
    };

    await this.habitRepository.create(habit);
    return habit;
  }
}
