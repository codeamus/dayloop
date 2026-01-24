// src/infraestructure/calendar/ExpoCalendarSyncService.ts
import type { Habit } from "@/domain/entities/Habit";
import type { CalendarSyncService } from "@/domain/services/CalendarSyncService";
import { addMinutesHHmm } from "@/utils/time";
import * as Calendar from "expo-calendar";
import { Platform } from "react-native";

const DAYLOOP_CALENDAR_TITLE = "Dayloop";
const DAYLOOP_COLOR = "#E6BC01";
const PUNTUAL_DURATION_MINUTES = 5;
const HORIZON_DAYS = 7;

function toLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function isHabitScheduledOnDate(habit: Habit, date: Date): boolean {
  const schedule = habit.schedule;
  if (!schedule) return true;

  if (schedule.type === "daily") return true;

  if (schedule.type === "weekly") {
    const dayOfWeek = date.getDay();
    const days = schedule.daysOfWeek ?? [];
    return days.length === 0 || days.includes(dayOfWeek);
  }

  if (schedule.type === "monthly") {
    const dayOfMonth = date.getDate();
    const days = schedule.daysOfMonth ?? [];
    return days.length === 0 || days.includes(dayOfMonth);
  }

  return true;
}

function isHabitActive(habit: Habit, todayYMD: string): boolean {
  if (habit.isPaused) return false;
  const ec = habit.endCondition;
  if (ec?.type === "byDate" && ec.endDate && ec.endDate < todayYMD)
    return false;
  return true;
}

function getTimesForHabit(habit: Habit): Array<{ start: string; end: string }> {
  const mode = habit.mode ?? "bloque";

  if (mode === "puntual") {
    const times: string[] =
      Array.isArray(habit.reminderTimes) && habit.reminderTimes.length > 0
        ? habit.reminderTimes
        : [habit.startTime ?? "08:00"];
    return times.map((start) => ({
      start,
      end: addMinutesHHmm(start, PUNTUAL_DURATION_MINUTES),
    }));
  }

  const blocks = habit.timeBlocks;
  if (Array.isArray(blocks) && blocks.length > 0) {
    return blocks.map((b) => ({ start: b.startTime, end: b.endTime }));
  }

  const start = habit.startTime ?? "08:00";
  const end = habit.endTime ?? addMinutesHHmm(start, 30);
  return [{ start, end }];
}

function parseHHmm(hhmm: string): [number, number] {
  const [h, m] = hhmm.split(":").map(Number);
  return [Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0];
}

function toDateLocal(dateYMD: string, hhmm: string): Date {
  const [y, mo, d] = dateYMD.split("-").map(Number);
  const [h, m] = parseHHmm(hhmm);
  return new Date(y, mo - 1, d, h, m, 0, 0);
}

export class ExpoCalendarSyncService implements CalendarSyncService {
  async syncHabits(habits: Habit[]): Promise<void> {
    if (Platform.OS !== "ios") return;

    try {
      const { status } = await Calendar.getCalendarPermissionsAsync();
      if (status !== "granted") {
        const { status: req } =
          await Calendar.requestCalendarPermissionsAsync();
        if (req !== "granted") return;
      }
    } catch {
      return;
    }

    try {
      const calendarId = await this.getOrCreateDayloopCalendar();
      if (!calendarId) return;

      const today = new Date();
      const todayYMD = toLocalYMD(today);
      const startRange = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      const endRange = new Date(startRange);
      endRange.setDate(endRange.getDate() + HORIZON_DAYS);

      const events = await Calendar.getEventsAsync(
        [calendarId],
        startRange,
        endRange
      );
      for (const ev of events) {
        try {
          await Calendar.deleteEventAsync(ev.id);
        } catch {
          // ignore per-event delete errors
        }
      }

      const active = habits.filter((h) => isHabitActive(h, todayYMD));
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? undefined;

      for (let i = 0; i < HORIZON_DAYS; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateYMD = toLocalYMD(d);

        for (const habit of active) {
          if (!isHabitScheduledOnDate(habit, d)) continue;

          const slots = getTimesForHabit(habit);
          for (const { start, end } of slots) {
            const startDate = toDateLocal(dateYMD, start);
            const endDate = toDateLocal(dateYMD, end);
            try {
              await Calendar.createEventAsync(calendarId, {
                title: `${habit.icon ?? ""} ${habit.name}`.trim(),
                startDate,
                endDate,
                allDay: false,
                timeZone: tz,
              });
            } catch {
              // skip failed event creation
            }
          }
        }
      }
    } catch (e) {
      if (__DEV__) console.warn("[ExpoCalendarSyncService] syncHabits", e);
    }
  }

  private async getOrCreateDayloopCalendar(): Promise<string | null> {
    try {
      const cals = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
      );
      const found = cals.find(
        (c) => c.title === DAYLOOP_CALENDAR_TITLE
      );
      if (found) return found.id;

      const defaultCal = await Calendar.getDefaultCalendarAsync();
      const source = defaultCal.source;
      const details: Partial<Calendar.Calendar> = {
        title: DAYLOOP_CALENDAR_TITLE,
        color: DAYLOOP_COLOR,
        entityType: Calendar.EntityTypes.EVENT,
        sourceId: source?.id,
        source: source ?? { name: "Dayloop", type: "local" },
      };
      const id = await Calendar.createCalendarAsync(details);
      return id;
    } catch (e) {
      if (__DEV__) console.warn("[ExpoCalendarSyncService] getOrCreate", e);
      return null;
    }
  }
}
