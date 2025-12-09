// app/habits/new.tsx
import { container } from "@/core/di/container";
import type { HabitSchedule } from "@/domain/entities/Habit";
import { Screen } from "@/presentation/components/Screen";
import { getTimeOfDayFromHour } from "@/utils/timeOfDay";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
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

const COLOR_PRESETS = ["#38BDF8", "#A855F7", "#F97316", "#22C55E", "#E11D48"];
const ICON_PRESETS = ["📚", "🏃‍♂️", "💧", "🧘‍♂️", "🧠", "✅"];

export default function NewHabit() {
  const [name, setName] = useState("");
  const [scheduleType, setScheduleType] =
    useState<HabitSchedule["type"]>("daily");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const [color, setColor] = useState<string>(COLOR_PRESETS[0]);
  const [icon, setIcon] = useState<string>(ICON_PRESETS[0]);

  const [time, setTime] = useState("08:00"); // string "HH:mm"

  function toggleWeekDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Nombre requerido", "Escribe un nombre para el hábito.");
      return;
    }

    let schedule: HabitSchedule;

    if (scheduleType === "daily") {
      schedule = { type: "daily" };
    } else {
      if (selectedDays.length === 0) {
        Alert.alert(
          "Selecciona días",
          "Para un hábito semanal debes elegir al menos un día."
        );
        return;
      }
      schedule = {
        type: "weekly",
        daysOfWeek: [...selectedDays].sort(),
      };
    }

    const timeOfDay = getTimeOfDayFromHour(time);

    await container.createHabit.execute({
      name: trimmed,
      color,
      icon,
      schedule,
      timeOfDay,
      time,
    });

    router.back();
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

        <Text style={styles.headerTitle}>Nuevo hábito</Text>
        <View style={{ width: 70 }} />
      </View>

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        placeholder="Ej: Leer 10 minutos"
        placeholderTextColor="#64748B"
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

      {/* Icono */}
      <Text style={styles.label}>Icono</Text>
      <View style={styles.iconsRow}>
        {ICON_PRESETS.map((i) => {
          const active = i === icon;
          return (
            <Pressable
              key={i}
              onPress={() => setIcon(i)}
              style={[styles.iconChip, active && styles.iconChipActive]}
            >
              <Text
                style={[
                  styles.iconChipText,
                  active && styles.iconChipTextActive,
                ]}
              >
                {i}
              </Text>
            </Pressable>
          );
        })}
      </View>

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

      <Text style={styles.label}>Hora</Text>
      <TextInput
        placeholder="Ej: 08:00"
        placeholderTextColor="#64748B"
        style={styles.input}
        value={time}
        onChangeText={setTime}
      />

      <Pressable onPress={save} style={styles.btn}>
        <Text style={styles.btnText}>Guardar</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backIcon: {
    color: "#E5E7EB",
    fontSize: 20,
    marginRight: 2,
  },
  backText: {
    color: "#E5E7EB",
    fontSize: 14,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  label: {
    color: "#CBD5F5",
    fontSize: 14,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#1E293B",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },

  colorsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  colorDotWrapper: {
    width: 30,
    height: 30,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  colorDotWrapperActive: {
    borderColor: "#38BDF8",
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 999,
  },

  iconsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  iconChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
  },
  iconChipActive: {
    backgroundColor: "#38BDF8",
    borderColor: "#38BDF8",
  },
  iconChipText: {
    fontSize: 16,
  },
  iconChipTextActive: {
    color: "#0F172A",
    fontWeight: "600",
  },

  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#020617",
    borderRadius: 999,
    padding: 3,
    gap: 4,
    marginTop: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  segmentActive: {
    backgroundColor: "#38BDF8",
  },
  segmentText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "500",
  },
  segmentTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  weekDaysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 8,
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipActive: {
    backgroundColor: "#38BDF8",
    borderColor: "#38BDF8",
  },
  dayChipText: {
    color: "#94A3B8",
    fontWeight: "500",
  },
  dayChipTextActive: {
    color: "#0F172A",
    fontWeight: "700",
  },
  btn: {
    backgroundColor: "#38BDF8",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 24,
  },
  btnText: {
    textAlign: "center",
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 16,
  },
});
