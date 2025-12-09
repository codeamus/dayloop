// src/domain/usecases/CreateHabit.ts
import type { Habit } from "@/domain/entities/Habit";
import type { HabitRepository } from "@/domain/repositories/HabitRepository";
import { randomUUID } from "expo-crypto";

export class CreateHabit {
  constructor(private habitRepository: HabitRepository) {}

  async execute(input: {
    name: string;
    color: string;
    icon: string;
    schedule: Habit["schedule"];
    timeOfDay: Habit["timeOfDay"];
    time: string;
  }) {
    const habit: Habit = {
      id: randomUUID(),
      name: input.name.trim(),
      color: input.color,
      icon: input.icon,
      schedule: input.schedule,
      timeOfDay: input.timeOfDay,
      time: input.time,
    };

    await this.habitRepository.create(habit);
    return habit;
  }
}
