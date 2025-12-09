// app/index.tsx
import { Screen } from "@/presentation/components/Screen";
import { useTodayHabits } from "@/presentation/hooks/useTodayHabits";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type FrequencyTab = "daily" | "weekly" | "monthly";
type TimeTab = "all" | "morning" | "afternoon" | "evening";

export default function TodayScreen() {
  const { loading, habits, toggle } = useTodayHabits();

  // Fila 1: Diario / Semanal / Mensual
  const [frequencyTab, setFrequencyTab] = useState<FrequencyTab>("daily");
  // Fila 2: Todos / Mañana / Tarde / Noche
  const [timeTab, setTimeTab] = useState<TimeTab>("all");

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </Screen>
    );
  }

  // 1) Filtro por frecuencia
  const byFrequency = habits.filter((h) => {
    const type = (h as any).scheduleType as FrequencyTab | undefined;
    if (!type) return true; // si aún no lo tienes mapeado, no rompe
    return type === frequencyTab;
  });

  // 2) Filtro por franja horaria
  const filtered = byFrequency.filter((h) => {
    if (timeTab === "all") return true;
    const slot = (h as any).timeOfDay as TimeTab | undefined;
    return slot === timeTab;
  });

  const pending = filtered.filter((h) => !h.done);
  const completed = filtered.filter((h) => h.done);

  return (
    <Screen>
      {/* HEADER simple */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inicio</Text>
      </View>

      {/* Fila 1: Diario / Semanal / Mensual */}
      <View style={styles.topTabs}>
        <SegmentButton
          label="Diario"
          active={frequencyTab === "daily"}
          onPress={() => setFrequencyTab("daily")}
        />
        <SegmentButton
          label="Semanal"
          active={frequencyTab === "weekly"}
          onPress={() => setFrequencyTab("weekly")}
        />
        <SegmentButton
          label="Mensual"
          active={frequencyTab === "monthly"}
          onPress={() => setFrequencyTab("monthly")}
        />
      </View>

      {/* Fila 2: Todos / Mañana / Tarde / Noche */}
      <View style={styles.filterRow}>
        <Chip
          label="Todos"
          active={timeTab === "all"}
          onPress={() => setTimeTab("all")}
        />
        <Chip
          label="Mañana"
          active={timeTab === "morning"}
          onPress={() => setTimeTab("morning")}
        />
        <Chip
          label="Tarde"
          active={timeTab === "afternoon"}
          onPress={() => setTimeTab("afternoon")}
        />
        <Chip
          label="Noche"
          active={timeTab === "evening"}
          onPress={() => setTimeTab("evening")}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Pendientes */}
        <Text style={styles.sectionTitle}>Pendientes</Text>
        {pending.map((h, index) => (
          <Pressable
            key={`${h.id}-${index}`} // si tienes IDs duplicados, esto evita el warning
            style={[styles.habitCard, { backgroundColor: h.color }]}
            onPress={() => toggle(h.id)}
          >
            <Text style={styles.habitText}>{h.name}</Text>
          </Pressable>
        ))}

        {/* Completados */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
          Completados
        </Text>
        {completed.map((h, index) => (
          <Pressable
            key={`${h.id}-${index}`}
            style={[styles.habitCard, { backgroundColor: h.color }]}
            onPress={() => toggle(h.id)}
          >
            <Text style={styles.habitText}>{h.name}</Text>
          </Pressable>
        ))}

        {/* Crear nuevo */}
        <View style={styles.createWrapper}>
          <Pressable
            style={styles.createButton}
            onPress={() => router.push("/habits/new")}
          >
            <Text style={styles.createText}>Crear nuevo hábito</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

/* --------- Subcomponentes --------- */

type SegmentProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function SegmentButton({ label, active, onPress }: SegmentProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segment, active && styles.segmentActive]}
      hitSlop={6}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

type ChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      hitSlop={6}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

/* --------- Styles --------- */

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    marginBottom: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },

  topTabs: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: "#8B5CF6",
  },
  segmentText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  segmentTextActive: {
    color: "#FFFFFF",
  },

  filterRow: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  chipActive: {
    backgroundColor: "#8B5CF6",
    borderColor: "#8B5CF6",
  },
  chipText: {
    fontSize: 12,
    color: "#111827",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  sectionTitle: {
    color: "#9CA3AF",
    fontSize: 13,
    marginBottom: 8,
  },

  habitCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  habitText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "600",
  },

  createWrapper: {
    marginTop: 24,
  },
  createButton: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
  },
  createText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
