// app/habits/index.tsx
import type { HabitSchedule } from "@/domain/entities/Habit";
import { Screen } from "@/presentation/components/Screen";
import { useAllHabits } from "@/presentation/hooks/useAllHabits";
import { router } from "expo-router";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import {
     ActivityIndicator,
     Alert,
     Pressable,
     StyleSheet,
     Text,
     View,
} from "react-native";

function formatSchedule(schedule: HabitSchedule): string {
  if (schedule.type === "daily") return "Diario";

  const map: Record<number, string> = {
    0: "D",
    1: "L",
    2: "M",
    3: "X",
    4: "J",
    5: "V",
    6: "S",
  };

  const sorted = [...schedule.daysOfWeek].sort();
  return sorted.map((d) => map[d]).join(" · ");
}

function RightActions({ onDelete }: { onDelete: () => void }) {
  return (
    <Pressable onPress={onDelete} style={styles.deleteAction}>
      <Text style={styles.deleteText}>Eliminar</Text>
    </Pressable>
  );
}


export default function HabitsListScreen() {
  const { habits, loading, remove } = useAllHabits();

  function confirmDelete(id: string, name: string) {
    Alert.alert(
      "Eliminar hábito",
      `¿Seguro que quieres eliminar "${name}"? Se perderá su historial.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => remove(id),
        },
      ]
    );
  }

  if (loading) {
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

        <Text style={styles.headerTitle}>Hábitos</Text>

        <Pressable
          onPress={() => router.push("/habits/new")}
          style={styles.addButton}
          hitSlop={10}
        >
          <Text style={styles.addButtonText}>+ Crear</Text>
        </Pressable>
      </View>

      {habits.length === 0 && (
        <Text style={styles.empty}>Aún no tienes hábitos creados.</Text>
      )}

      {habits.map((h) => (
        <Swipeable
          key={h.id}
          overshootRight={false}
          renderRightActions={() => (
            <RightActions onDelete={() => confirmDelete(h.id, h.name)} />
          )}
        >
          <Pressable
            style={styles.item}
            onPress={() => router.push(`/habits/${h.id}`)}
          >
            <View>
              <Text style={styles.name}>{h.name}</Text>
              <Text style={styles.schedule}>{formatSchedule(h.schedule)}</Text>
            </View>
            <Text style={styles.icon}>{h.icon}</Text>
          </Pressable>
        </Swipeable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
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
  addButton: {
    backgroundColor: "#38BDF8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  addButtonText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 14,
  },
  empty: {
    color: "#94A3B8",
  },
  item: {
    marginTop: 10,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#0F172A",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "500",
  },
  schedule: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 2,
  },
  icon: {
    fontSize: 20,
  },
  deleteAction: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    marginTop: 10,
    borderRadius: 10,
  },
  deleteText: {
    color: "#F9FAFB",
    fontWeight: "700",
  },
});
