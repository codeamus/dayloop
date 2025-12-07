import { container } from "@/core/di/container";
import type { Habit, HabitSchedule } from "@/domain/entities/Habit";
import { Screen } from "@/presentation/components/Screen";
import { useHabit } from "@/presentation/hooks/useHabit";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
     ActivityIndicator,
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

export default function EditHabitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habitId = Array.isArray(id) ? id[0] : id;

  const { habit, loading } = useHabit(habitId);

  const [name, setName] = useState("");
  const [scheduleType, setScheduleType] =
    useState<HabitSchedule["type"]>("daily");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  // Inicializar el state cuando ya tenemos el hábito
  useMemo(() => {
    if (!habit) return;
    setName(habit.name);
    if (habit.schedule.type === "daily") {
      setScheduleType("daily");
      setSelectedDays([]);
    } else {
      setScheduleType("weekly");
      setSelectedDays(habit.schedule.daysOfWeek);
    }
  }, [habit]);

  function toggleWeekDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSave() {
    if (!habit) return;

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

    const updated: Habit = {
      ...habit,
      name: trimmed,
      schedule,
      // TODO: más adelante: color/icon editables también
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
          <ActivityIndicator size="large" color="#FFF" />
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

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        placeholder="Ej: Leer 10 minutos"
        placeholderTextColor="#64748B"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

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

      <Pressable onPress={handleSave} style={styles.btn}>
        <Text style={styles.btnText}>Guardar cambios</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  deleteButtonText: {
    color: "#FCA5A5",
    fontSize: 12,
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
