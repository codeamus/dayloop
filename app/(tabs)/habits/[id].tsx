// app/(tabs)/habits/[id].tsx
import { container } from "@/core/di/container";
import type { Habit, HabitSchedule } from "@/domain/entities/Habit";
import { Screen } from "@/presentation/components/Screen";
import { useHabit } from "@/presentation/hooks/useHabit";
import { useHabitStreak } from "@/presentation/hooks/useHabitStreak";
import { colors } from "@/theme/colors";
import { addMinutesHHmm } from "@/utils/time";
import { getTimeOfDayFromHour } from "@/utils/timeOfDay";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
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
const ICON_PRESETS = ["📚", "🏃‍♂️", "💧", "🧘‍♂️", "🧠", "✅"];

type PickerTarget = "start" | "end";

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

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = Array.isArray(id) ? id[0] : id;

  const { streak } = useHabitStreak(habitId);
  const { habit, loading } = useHabit(habitId);

  const [name, setName] = useState("");
  const [scheduleType, setScheduleType] =
    useState<HabitSchedule["type"]>("daily");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [color, setColor] = useState<string>(COLOR_PRESETS[0]);
  const [icon, setIcon] = useState<string>(ICON_PRESETS[0]);

  // ✅ Bloque horario
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>("08:30");

  // Picker
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>("start");
  const [pickerDate, setPickerDate] = useState<Date>(() =>
    buildDateForTime("08:00")
  );

  useEffect(() => {
    if (!id) return;
    void container.getHabitStreaks.execute(id.toString()).catch(() => null);
  }, [id]);

  // ✅ Inicialización correcta con side-effects: useEffect (NO useMemo)
  useEffect(() => {
    if (!habit) return;

    setName(habit.name);

    if (habit.schedule.type === "daily") {
      setScheduleType("daily");
      setSelectedDays([]);
    } else {
      setScheduleType("weekly");
      setSelectedDays(habit.schedule.daysOfWeek);
    }

    setColor(habit.color || COLOR_PRESETS[0]);
    setIcon(habit.icon || ICON_PRESETS[0]);

    const s = habit.startTime ?? habit.time ?? "08:00";
    const e = habit.endTime ?? addMinutesHHmm(s, 30);
    setStartTime(s);
    setEndTime(e);
  }, [habit]);

  function toggleWeekDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

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

        // Si end queda inválido => start + 30
        const startMin = hhmmToMinutes(picked);
        const endMin = hhmmToMinutes(endTime);
        if (endMin <= startMin) {
          setEndTime(minutesToHHmm(startMin + 30));
        }
      } else {
        // end
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

    let schedule: HabitSchedule;

    if (scheduleType === "daily") {
      schedule = { type: "daily", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
    } else {
      if (selectedDays.length === 0) {
        Alert.alert(
          "Selecciona días",
          "Para un hábito semanal debes elegir al menos un día."
        );
        return;
      }
      schedule = { type: "weekly", daysOfWeek: [...selectedDays].sort() };
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

    const timeOfDay = getTimeOfDayFromHour(startTime);

    const updated: Habit = {
      ...habit,
      name: trimmed,
      schedule,
      color,
      icon,

      // ✅ nuevo
      startTime,
      endTime,

      // ⚠️ legacy (compat)
      time: startTime,

      timeOfDay,
    };

    await container.updateHabit.execute(updated);
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
              <Text style={styles.streakPillText}>
                {streak.currentDailyStreak} 🔥
              </Text>
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

          {streak.bestWeeklyStreak > 0 && (
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
      <View style={styles.iconsRow}>
        {ICON_PRESETS.map((i) => {
          const active = i === icon;
          return (
            <Pressable
              key={i}
              onPress={() => setIcon(i)}
              style={[styles.iconChip, active && styles.iconChipActive]}
            >
              <Text style={styles.iconChipText}>{i}</Text>
            </Pressable>
          );
        })}
      </View>

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
      </View>

      {scheduleType === "weekly" && (
        <View style={styles.weekDaysContainer}>
          {WEEK_DAYS.map((day) => {
            const active = selectedDays.includes(day.value);
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

  iconsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(43,62,74,0.20)",
  },
  iconChipActive: {
    backgroundColor: "rgba(230,188,1,0.16)",
    borderColor: "rgba(230,188,1,0.45)",
  },
  iconChipText: { fontSize: 16 },

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
  timeDoneText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "900",
  },

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
});
