import { Screen } from "@/presentation/components/Screen";
import { useTodayHabits } from "@/presentation/hooks/useTodayHabits";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { scheduleDailyReminder } from "@/core/notifications/notifications";

async function handleScheduleReminder() {
  // Por ahora: hora fija 21:00
  await scheduleDailyReminder(21, 0);
  // luego puedes meter un toast/snackbar si quieres
  console.log("Recordatorio diario programado para las 21:00");
}

export default function TodayScreen() {
  const { loading, habits, toggle } = useTodayHabits();

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
      <View style={styles.header}>
        <Text style={styles.title}>Hoy</Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => router.push("/stats")}
            style={styles.secondaryButton}
            hitSlop={10}
          >
            <Text style={styles.secondaryButtonText}>Stats</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/settings")}
            style={styles.secondaryButton}
            hitSlop={10}
          >
            <Text style={styles.secondaryButtonText}>Ajustes</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/habits")}
            style={styles.secondaryButton}
            hitSlop={10}
          >
            <Text style={styles.secondaryButtonText}>Hábitos</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/habits/new")}
            style={styles.addButton}
            hitSlop={10}
          >
            <Text style={styles.addButtonText}>+ Crear</Text>
          </Pressable>
        </View>
      </View>

      {habits.length === 0 && (
        <Text style={styles.empty}>No tienes hábitos configurados aún.</Text>
      )}

      {habits.map((h) => (
        <Pressable
          key={h.id}
          onPress={() => toggle(h.id)}
          style={[
            styles.habitItem,
            h.done && styles.habitDone,
            { borderLeftColor: h.color },
          ]}
        >
          <Text style={styles.habitText}>{h.name}</Text>
          <Text>{h.done ? "✔️" : "⭕"}</Text>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "700",
  },
  addButton: {
    backgroundColor: "#38BDF8",
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  habitItem: {
    padding: 16,
    marginTop: 10,
    backgroundColor: "#1E293B",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    borderLeftWidth: 6,
  },
  habitDone: {
    opacity: 0.5,
  },
  habitText: {
    color: "#fff",
    fontSize: 16,
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
  },
  secondaryButtonText: {
    color: "#E5E7EB",
    fontSize: 14,
  },
});
