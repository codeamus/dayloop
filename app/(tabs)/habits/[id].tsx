// app/(tabs)/habits/[id].tsx
import { container } from "@/core/di/container";
import type { Habit, HabitSchedule } from "@/domain/entities/Habit";
import { EmojiPickerSheet } from "@/presentation/components/EmojiPickerSheet";
import MonthlyCalendar from "@/presentation/components/MonthlyCalendar";
import { Screen } from "@/presentation/components/Screen";
import { useToast } from "@/presentation/components/ToastProvider";
import { useHabit } from "@/presentation/hooks/useHabit";
import { useHabitMonthlyStats } from "@/presentation/hooks/useHabitMonthlyStats";
import { useHabitStreak } from "@/presentation/hooks/useHabitStreak";
import { useToggleHabitForDate } from "@/presentation/hooks/useToggleHabitForDate";
import { colors } from "@/theme/colors";
import { addMinutesHHmm } from "@/utils/time";
import { getTimeOfDayFromHour } from "@/utils/timeOfDay";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const WEEK_DAYS = [
  { label: "D", value: 0 },
  { label: "L", value: 1 },
  { label: "M", value: 2 },
  { label: "X", value: 3 },
  { label: "J", value: 4 },
  { label: "V", value: 5 },
  { label: "S", value: 6 },
];

const COLOR_PRESETS = ["#e6bc01", "#8ecd6e", "#f1e9d7", "#2b3e4a", "#ef4444"];

type PickerTarget = "start" | "end";
type ScheduleType = HabitSchedule["type"]; // daily | weekly | monthly

function hhmmToMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const safeH = Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 0;
  const safeM = Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0;
  return safeH * 60 + safeM;
}

function minutesToHHmm(total: number): string {
  const min = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function buildDateForTime(hhmm: string): Date {
  const d = new Date();
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  d.setHours(h, m, 0, 0);
  return d;
}

function uniqueSortedNumbers(xs: number[]) {
  return Array.from(new Set(xs)).sort((a, b) => a - b);
}

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = Array.isArray(id) ? id[0] : id;

  const { streak, refresh: refreshStreak } = useHabitStreak(habitId);
  const { habit, loading } = useHabit(habitId);

  // ✅ Ajuste UI: mostrar rachas semanales solo si el hábito es weekly
  const isWeeklyHabit = habit?.schedule?.type === "weekly";

  // ✅ UI mensual + validación real
  const {
    stats: monthlyStats,
    loading: monthlyLoading,
    prevMonth,
    nextMonth,
    refresh: refreshMonthly,
  } = useHabitMonthlyStats(habitId);

  const [name, setName] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("daily");

  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);
  const [selectedMonthDays, setSelectedMonthDays] = useState<number[]>([]);

  const [color, setColor] = useState<string>(COLOR_PRESETS[0]);
  const [icon, setIcon] = useState<string>("📚");

  // bloque horario
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("08:30");

  // Picker
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>("start");
  const [pickerDate, setPickerDate] = useState<Date>(() =>
    buildDateForTime("08:00")
  );

  const [isEmojiSheetOpen, setIsEmojiSheetOpen] = useState(false);

  const { toggle: toggleForDate } = useToggleHabitForDate(habitId);
  const { show } = useToast();

  useEffect(() => {
    if (!habitId) return;
    void container.getHabitStreaks.execute(habitId).catch(() => null);
  }, [habitId]);

  useEffect(() => {
    if (!habit) return;

    setName(habit.name);
    setColor(habit.color || COLOR_PRESETS[0]);
    setIcon(habit.icon || "📚");

    // schedule init
    if (habit.schedule.type === "daily") {
      setScheduleType("daily");
      setSelectedWeekDays([]);
      setSelectedMonthDays([]);
    } else if (habit.schedule.type === "weekly") {
      setScheduleType("weekly");
      setSelectedWeekDays(
        Array.isArray(habit.schedule.daysOfWeek)
          ? habit.schedule.daysOfWeek
          : []
      );
      setSelectedMonthDays([]);
    } else {
      // monthly
      setScheduleType("monthly");
      setSelectedMonthDays(
        Array.isArray((habit.schedule as any).daysOfMonth)
          ? (habit.schedule as any).daysOfMonth
          : []
      );
      setSelectedWeekDays([]);
    }

    const s = habit.startTime ?? habit.time ?? "08:00";
    const e = habit.endTime ?? addMinutesHHmm(s, 30);
    setStartTime(s);
    setEndTime(e);
  }, [habit]);

  function toggleWeekDay(day: number) {
    setSelectedWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function toggleMonthDay(day: number) {
    setSelectedMonthDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  const monthDays = useMemo(
    () => Array.from({ length: 31 }, (_, i) => i + 1),
    []
  );

  const openPickerFor = useCallback(
    (target: PickerTarget) => {
      setPickerTarget(target);
      const current = target === "start" ? startTime : endTime;
      setPickerDate(buildDateForTime(current));
      setShowTimePicker(true);
    },
    [startTime, endTime]
  );

  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === "dismissed") {
        if (Platform.OS === "android") setShowTimePicker(false);
        return;
      }

      const d = selectedDate ?? pickerDate;
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const picked = `${hh}:${mm}`;

      if (pickerTarget === "start") {
        setStartTime(picked);
        const startMin = hhmmToMinutes(picked);
        const endMin = hhmmToMinutes(endTime);
        if (endMin <= startMin) setEndTime(minutesToHHmm(startMin + 30));
      } else {
        const startMin = hhmmToMinutes(startTime);
        const endMin = hhmmToMinutes(picked);
        if (endMin <= startMin) {
          Alert.alert(
            "Horario inválido",
            "La hora de fin debe ser mayor que la hora de inicio."
          );
        } else {
          setEndTime(picked);
        }
      }

      setPickerDate(d);
      if (Platform.OS === "android") setShowTimePicker(false);
    },
    [pickerDate, pickerTarget, startTime, endTime]
  );

  async function handleSave() {
    if (!habit) return;

    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Nombre requerido", "Escribe un nombre para el hábito.");
      return;
    }

    const startMin = hhmmToMinutes(startTime);
    const endMin = hhmmToMinutes(endTime);
    if (endMin <= startMin) {
      Alert.alert(
        "Horario inválido",
        "La hora de fin debe ser mayor que la hora de inicio."
      );
      return;
    }

    let schedule: HabitSchedule;

    if (scheduleType === "daily") {
      schedule = { type: "daily" };
    } else if (scheduleType === "weekly") {
      const days = uniqueSortedNumbers(selectedWeekDays).filter(
        (d) => d >= 0 && d <= 6
      );
      if (days.length === 0) {
        Alert.alert(
          "Selecciona días",
          "Para un hábito semanal debes elegir al menos un día."
        );
        return;
      }
      schedule = { type: "weekly", daysOfWeek: days };
    } else {
      // monthly
      const days = uniqueSortedNumbers(selectedMonthDays).filter(
        (d) => d >= 1 && d <= 31
      );
      if (days.length === 0) {
        Alert.alert(
          "Selecciona días",
          "Para un hábito mensual debes elegir al menos un día del mes."
        );
        return;
      }
      schedule = { type: "monthly", daysOfMonth: days } as any;
    }

    const timeOfDay = getTimeOfDayFromHour(startTime);

    const updated: Habit = {
      ...habit,
      name: trimmed,
      schedule,
      color,
      icon,
      startTime,
      endTime,
      time: startTime,
      timeOfDay,
    };

    await container.updateHabit.execute(updated);
    await refreshMonthly();
    router.back();
  }

  async function handleDelete() {
    if (!habit) return;

    Alert.alert(
      "Eliminar hábito",
      `¿Seguro que quieres eliminar "${habit.name}"? Se perderá su historial.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await container.deleteHabit.execute(habit.id);
            router.back();
          },
        },
      ]
    );
  }

  if (loading || !habit) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando hábito…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={10}
          >
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backText}>Volver</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Editar hábito</Text>

          <Pressable
            onPress={handleDelete}
            style={styles.deleteButton}
            hitSlop={10}
          >
            <Text style={styles.deleteButtonText}>Eliminar</Text>
          </Pressable>
        </View>

        {/* Rachas */}
        {!!streak && (
          <View style={styles.streakCard}>
            <View style={styles.streakHeader}>
              <Text style={styles.streakTitle}>Rachas</Text>
              <View style={styles.streakPill}>
                <View style={styles.streakPillRow}>
                  <Feather name="zap" size={14} color={colors.primary} />
                  <Text style={styles.streakPillText}>
                    {streak.currentDailyStreak}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.streakRow}>
              <Text style={styles.streakLabel}>Racha diaria actual</Text>
              <Text style={styles.streakValue}>
                {streak.currentDailyStreak} días
              </Text>
            </View>

            <View style={styles.streakRow}>
              <Text style={styles.streakLabel}>Mejor racha diaria</Text>
              <Text style={styles.streakValue}>
                {streak.bestDailyStreak} días
              </Text>
            </View>

            {isWeeklyHabit && (
              <>
                <View style={styles.streakRow}>
                  <Text style={styles.streakLabel}>Racha semanal actual</Text>
                  <Text style={styles.streakValue}>
                    {streak.currentWeeklyStreak} semanas
                  </Text>
                </View>

                <View style={styles.streakRow}>
                  <Text style={styles.streakLabel}>Mejor racha semanal</Text>
                  <Text style={styles.streakValue}>
                    {streak.bestWeeklyStreak} semanas
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Calendario mensual + validación real */}
        <View style={styles.monthlyCard}>
          <View style={styles.monthlyHeader}>
            <Text style={styles.monthlyTitle}>Calendario mensual</Text>
            {monthlyLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : null}
          </View>

          {!!monthlyStats && (
            <>
              <View style={styles.monthlyStatsRow}>
                <View style={styles.monthlyPill}>
                  <View style={styles.monthlyPillRow}>
                    <Feather name="zap" size={14} color={colors.text} />
                    <Text style={styles.monthlyPillText}>
                      {monthlyStats.currentMonthlyStreak}
                    </Text>
                  </View>
                </View>

                <View style={styles.monthlyPill}>
                  <View style={styles.monthlyPillRow}>
                    <Feather name="award" size={14} color={colors.text} />
                    <Text style={styles.monthlyPillText}>
                      {monthlyStats.bestMonthlyStreak}
                    </Text>
                  </View>
                </View>

                <View style={styles.monthlyPill}>
                  <View style={styles.monthlyPillRow}>
                    <Feather
                      name="check-circle"
                      size={14}
                      color={colors.text}
                    />
                    <Text style={styles.monthlyPillText}>
                      {monthlyStats.doneDays}/{monthlyStats.scheduledDays}
                    </Text>
                  </View>
                </View>

                <View style={styles.monthlyPill}>
                  <View style={styles.monthlyPillRow}>
                    <Feather name="bar-chart-2" size={14} color={colors.text} />
                    <Text style={styles.monthlyPillText}>
                      {Math.round(monthlyStats.completionRate * 100)}%
                    </Text>
                  </View>
                </View>
              </View>

              <MonthlyCalendar
                year={monthlyStats.year}
                month={monthlyStats.month}
                days={monthlyStats.days}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
                onPressDay={async (date) => {
                  await toggleForDate(date);
                  await refreshMonthly();
                  await refreshStreak();
                }}
                onBlockedPress={({ state }) => {
                  if (state === "future")
                    return show("Aún no puedes marcar días futuros", "info");
                  if (state === "unscheduled")
                    return show("Este día no está programado", "info");
                }}
              />
            </>
          )}
        </View>

        {/* Nombre */}
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          placeholder="Ej: Leer 10 minutos"
          placeholderTextColor={colors.mutedText}
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        {/* Color */}
        <Text style={styles.label}>Color</Text>
        <View style={styles.colorsRow}>
          {COLOR_PRESETS.map((c) => {
            const active = c === color;
            return (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[
                  styles.colorDotWrapper,
                  active && styles.colorDotWrapperActive,
                ]}
              >
                <View style={[styles.colorDot, { backgroundColor: c }]} />
              </Pressable>
            );
          })}
        </View>

        {/* Ícono */}
        <Text style={styles.label}>Ícono</Text>
        <View style={styles.iconPickerRow}>
          <View style={styles.iconPreview}>
            <Text style={styles.iconPreviewText}>{icon || "🙂"}</Text>
          </View>

          <Pressable
            onPress={() => setIsEmojiSheetOpen(true)}
            style={styles.iconPickerButton}
            hitSlop={10}
          >
            <Text style={styles.iconPickerButtonText}>Elegir ícono</Text>
          </Pressable>
        </View>

        <EmojiPickerSheet
          visible={isEmojiSheetOpen}
          value={icon}
          onClose={() => setIsEmojiSheetOpen(false)}
          onSelect={(e) => setIcon(e)}
        />

        {/* Frecuencia */}
        <Text style={styles.label}>Frecuencia</Text>
        <View style={styles.segmentContainer}>
          <Pressable
            onPress={() => setScheduleType("daily")}
            style={[
              styles.segment,
              scheduleType === "daily" && styles.segmentActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                scheduleType === "daily" && styles.segmentTextActive,
              ]}
            >
              Diario
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setScheduleType("weekly")}
            style={[
              styles.segment,
              scheduleType === "weekly" && styles.segmentActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                scheduleType === "weekly" && styles.segmentTextActive,
              ]}
            >
              Semanal
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setScheduleType("monthly")}
            style={[
              styles.segment,
              scheduleType === "monthly" && styles.segmentActive,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                scheduleType === "monthly" && styles.segmentTextActive,
              ]}
            >
              Mensual
            </Text>
          </Pressable>
        </View>

        {/* Selector semanal */}
        {scheduleType === "weekly" && (
          <View style={styles.weekDaysContainer}>
            {WEEK_DAYS.map((day) => {
              const active = selectedWeekDays.includes(day.value);
              return (
                <Pressable
                  key={day.value}
                  onPress={() => toggleWeekDay(day.value)}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      active && styles.dayChipTextActive,
                    ]}
                  >
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Selector mensual */}
        {scheduleType === "monthly" && (
          <View style={styles.monthContainer}>
            <Text style={styles.monthHint}>Selecciona días del mes (1–31)</Text>
            <View style={styles.monthGrid}>
              {monthDays.map((d) => {
                const active = selectedMonthDays.includes(d);
                return (
                  <Pressable
                    key={d}
                    onPress={() => toggleMonthDay(d)}
                    style={[styles.monthChip, active && styles.monthChipActive]}
                  >
                    <Text
                      style={[
                        styles.monthChipText,
                        active && styles.monthChipTextActive,
                      ]}
                    >
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Horario */}
        <Text style={styles.label}>Horario</Text>
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Pressable
            style={styles.timeButton}
            onPress={() => openPickerFor("start")}
          >
            <Text style={styles.timeButtonText}>{startTime}</Text>
            <View style={styles.timePill}>
              <Text style={styles.timePillText}>Inicio</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.timeButton}
            onPress={() => openPickerFor("end")}
          >
            <Text style={styles.timeButtonText}>{endTime}</Text>
            <View style={styles.timePill}>
              <Text style={styles.timePillText}>Fin</Text>
            </View>
          </Pressable>
        </View>

        {showTimePicker && (
          <View style={styles.timePickerContainer}>
            <DateTimePicker
              value={pickerDate}
              mode="time"
              is24Hour
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleTimeChange}
              themeVariant="dark"
            />

            {Platform.OS === "ios" && (
              <Pressable
                style={styles.timeDoneButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.timeDoneText}>Listo</Text>
              </Pressable>
            )}
          </View>
        )}

        <Pressable onPress={handleSave} style={styles.btn}>
          <Text style={styles.btnText}>Guardar cambios</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: colors.mutedText, fontSize: 13 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(50,73,86,0.40)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backIcon: {
    color: colors.text,
    fontSize: 18,
    marginRight: 2,
    fontWeight: "900",
  },
  backText: { color: colors.text, fontSize: 13, fontWeight: "800" },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },

  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.55)",
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  deleteButtonText: { color: colors.danger, fontSize: 12, fontWeight: "900" },

  streakCard: {
    marginTop: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(50,73,86,0.55)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  streakHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  streakTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  streakPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(230,188,1,0.16)",
    borderWidth: 1,
    borderColor: "rgba(230,188,1,0.45)",
  },
  streakPillText: { color: colors.primary, fontWeight: "900", fontSize: 12 },
  streakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  streakLabel: { color: colors.mutedText, fontSize: 12, fontWeight: "800" },
  streakValue: { color: colors.text, fontSize: 12, fontWeight: "900" },

  monthlyCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(50,73,86,0.55)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthlyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  monthlyTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  monthlyStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  monthlyPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(43,62,74,0.35)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthlyPillText: { color: colors.text, fontWeight: "900", fontSize: 12 },

  label: {
    color: colors.mutedText,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  input: {
    backgroundColor: "rgba(50,73,86,0.45)",
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    fontWeight: "700",
  },

  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(43,62,74,0.35)",
    borderRadius: 999,
    padding: 4,
    gap: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.mutedText, fontSize: 13, fontWeight: "900" },
  segmentTextActive: { color: colors.primaryText, fontWeight: "900" },

  weekDaysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  dayChip: {
    flex: 1,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43,62,74,0.20)",
  },
  dayChipActive: {
    backgroundColor: "rgba(142,205,110,0.25)",
    borderColor: "rgba(142,205,110,0.55)",
  },
  dayChipText: { color: colors.mutedText, fontWeight: "900" },
  dayChipTextActive: { color: colors.success, fontWeight: "900" },

  monthContainer: { marginTop: 10 },
  monthHint: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthChip: {
    width: 44,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43,62,74,0.20)",
  },
  monthChipActive: {
    backgroundColor: "rgba(230,188,1,0.18)",
    borderColor: "rgba(230,188,1,0.55)",
  },
  monthChipText: { color: colors.mutedText, fontWeight: "900" },
  monthChipTextActive: { color: colors.primary, fontWeight: "900" },

  colorsRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  colorDotWrapper: {
    width: 34,
    height: 34,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "rgba(43,62,74,0.20)",
  },
  colorDotWrapperActive: { borderColor: colors.primary },
  colorDot: { width: 22, height: 22, borderRadius: 999 },

  iconPickerRow: { flexDirection: "row", alignItems: "center", gap: 12 },

  iconPreview: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43,62,74,0.35)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconPreviewText: { fontSize: 26 },

  iconPickerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconPickerButtonText: { color: colors.text, fontSize: 13, fontWeight: "900" },

  timeButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(43,62,74,0.25)",
  },
  timeButtonText: { fontSize: 16, color: colors.text, fontWeight: "900" },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.16)",
  },
  timePillText: { color: colors.text, fontSize: 12, fontWeight: "900" },

  timePickerContainer: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(43,62,74,0.35)",
  },
  timeDoneButton: {
    alignSelf: "flex-end",
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.18)",
    backgroundColor: "rgba(241,233,215,0.08)",
  },
  timeDoneText: { fontSize: 13, color: colors.text, fontWeight: "900" },

  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 22,
  },
  btnText: {
    textAlign: "center",
    color: colors.primaryText,
    fontWeight: "900",
    fontSize: 15,
  },

  streakPillRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  monthlyPillRow: { flexDirection: "row", alignItems: "center", gap: 6 },
});
