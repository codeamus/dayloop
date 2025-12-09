// app/stats/index.tsx
import { Screen } from "@/presentation/components/Screen";
import { useWeeklySummary } from "@/presentation/hooks/useWeeklySummary";
import { router } from "expo-router";
import {
     ActivityIndicator,
     Pressable,
     StyleSheet,
     Text,
     View,
} from "react-native";

export default function StatsScreen() {
  const { loading, days } = useWeeklySummary();

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      </Screen>
    );
  }

  const daysWithHabits = days.filter((d) => d.totalPlanned > 0);
  const overallRate =
    daysWithHabits.length === 0
      ? 0
      : daysWithHabits.reduce((acc, d) => acc + d.completionRate, 0) /
        daysWithHabits.length;

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

        <Text style={styles.headerTitle}>Estadísticas</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Resumen global */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Últimos 7 días</Text>
        <Text style={styles.cardMainValue}>
          {Math.round(overallRate * 100)}%
        </Text>
        <Text style={styles.cardSubtitle}>
          Promedio de cumplimiento (solo días con hábitos planificados)
        </Text>
      </View>

      {/* Lista por día */}
      <Text style={styles.sectionTitle}>Detalle por día</Text>

      {days.length === 0 && (
        <Text style={styles.empty}>
          Aún no hay datos suficientes para mostrar estadísticas.
        </Text>
      )}

      {days.map((day) => {
        const pct = Math.round(day.completionRate * 100);
        const width = `${pct}%`;

        return (
          <View key={day.date} style={styles.dayRow}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              <Text style={styles.dayInfo}>
                {day.totalDone}/{day.totalPlanned} completados ({pct}%)
              </Text>
            </View>

            <View style={styles.barBackground}>
              <View style={[styles.barFill, { width }]} />
            </View>
          </View>
        );
      })}
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

  card: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1E293B",
    marginBottom: 16,
  },
  cardTitle: {
    color: "#9CA3AF",
    fontSize: 13,
  },
  cardMainValue: {
    color: "#F9FAFB",
    fontSize: 32,
    fontWeight: "700",
    marginTop: 4,
  },
  cardSubtitle: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 4,
  },
  sectionTitle: {
    color: "#CBD5F5",
    fontSize: 13,
    marginBottom: 8,
  },
  empty: {
    color: "#9CA3AF",
    fontSize: 12,
  },
  dayRow: {
    marginBottom: 10,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  dayLabel: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "500",
  },
  dayInfo: {
    color: "#9CA3AF",
    fontSize: 11,
  },
  barBackground: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#1E293B",
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#38BDF8",
  },
});
