// app/(tabs)/habits/index.tsx
import type { HabitSchedule } from "@/domain/entities/Habit";
import { Screen } from "@/presentation/components/Screen";
import { useAllHabits } from "@/presentation/hooks/useAllHabits";
import { colors } from "@/theme/colors";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";

// ✅ Robusto: no revienta si el schedule no trae daysOfWeek (daily / monthly / legacy)
function formatSchedule(schedule: HabitSchedule | any): string {
  if (!schedule || typeof schedule !== "object") return "Diario";

  const type = schedule.type;

  if (type === "daily") return "Diario";

  if (type === "weekly") {
    const map: Record<number, string> = {
      0: "D",
      1: "L",
      2: "M",
      3: "X",
      4: "J",
      5: "V",
      6: "S",
    };

    const days = Array.isArray(schedule.daysOfWeek) ? schedule.daysOfWeek : [];
    const sorted = [...days].sort((a, b) => a - b);

    return sorted.length
      ? sorted.map((d) => map[d] ?? "?").join(" · ")
      : "Semanal";
  }

  // ✅ Si ya existe monthly en tu app aunque la entidad no lo tenga tipado aún
  if (type === "monthly") {
    const days = Array.isArray(schedule.daysOfMonth)
      ? schedule.daysOfMonth
      : [];
    const sorted = [...days].sort((a, b) => a - b);
    return sorted.length ? `Mensual: ${sorted.join(", ")}` : "Mensual";
  }

  // Fallback seguro
  return "Diario";
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
        { text: "Eliminar", style: "destructive", onPress: () => remove(id) },
      ]
    );
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando hábitos…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={styles.backButton}
          hitSlop={10}
        >
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Hábitos</Text>

        <Pressable
          onPress={() => router.push("/habit-new")}
          style={styles.addButton}
          hitSlop={10}
        >
          <Text style={styles.addButtonText}>+ Crear</Text>
        </Pressable>
      </View>

      {habits.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Aún no tienes hábitos</Text>
          <Text style={styles.emptySubtitle}>
            Crea tu primer hábito y comienza tu loop.
          </Text>

          <Pressable
            style={styles.emptyCta}
            onPress={() => router.push("/habit-new")}
          >
            <Text style={styles.emptyCtaText}>Crear hábito</Text>
          </Pressable>
        </View>
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
            onPress={() => router.push(`/(tabs)/habits/${h.id}`)}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.name}>{h.name}</Text>
              <Text style={styles.schedule}>{formatSchedule(h.schedule)}</Text>
            </View>

            <View style={styles.right}>
              <Text style={styles.icon}>{h.icon}</Text>
              <Text style={styles.chev}>›</Text>
            </View>
          </Pressable>
        </Swipeable>
      ))}
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
  backText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },

  addButton: {
    backgroundColor: "rgba(230,188,1,0.16)",
    borderWidth: 1,
    borderColor: "rgba(230,188,1,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  addButtonText: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 13,
  },

  emptyBox: {
    marginTop: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(50,73,86,0.55)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  emptySubtitle: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  emptyCta: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  emptyCtaText: {
    color: colors.primaryText,
    fontSize: 14,
    fontWeight: "900",
  },

  item: {
    marginTop: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(50,73,86,0.45)",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  schedule: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 3,
    fontWeight: "700",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  icon: {
    fontSize: 20,
  },
  chev: {
    color: "rgba(241,233,215,0.55)",
    fontSize: 18,
    fontWeight: "900",
    marginTop: -1,
  },

  deleteAction: {
    backgroundColor: colors.danger,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    marginTop: 10,
    borderRadius: 18,
  },
  deleteText: {
    color: colors.text,
    fontWeight: "900",
  },
});
