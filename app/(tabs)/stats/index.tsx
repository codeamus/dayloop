// app/stats/index.tsx
import { Screen } from "@/presentation/components/Screen";
import { useWeeklySummary } from "@/presentation/hooks/useWeeklySummary";
import { colors } from "@/theme/colors";
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Calculando estadísticas…</Text>
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

  const overallPct = Math.round(overallRate * 100);

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

        <View style={styles.bigRow}>
          <Text style={styles.cardMainValue}>{overallPct}%</Text>
          <View style={styles.bigRight}>
            <Text style={styles.bigHint}>Promedio</Text>
            <Text style={styles.bigSubHint}>
              (solo días con hábitos planificados)
            </Text>
          </View>
        </View>

        <View style={styles.bigBarBackground}>
          <View style={[styles.bigBarFill, { width: `${overallPct}%` }]} />
        </View>
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

        return (
          <View key={day.date} style={styles.dayRow}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              <Text style={styles.dayInfo}>
                {day.totalDone}/{day.totalPlanned} ({pct}%)
              </Text>
            </View>

            <View style={styles.barBackground}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>
          </View>
        );
      })}
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

  card: {
    marginTop: 8,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(50,73,86,0.55)",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  cardTitle: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  bigRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 6,
    gap: 12,
  },
  cardMainValue: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "900",
  },
  bigRight: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  bigHint: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },
  bigSubHint: {
    color: "rgba(241,233,215,0.70)",
    fontSize: 11,
    marginTop: 2,
    textAlign: "right",
    fontWeight: "700",
  },

  bigBarBackground: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(43,62,74,0.35)",
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginTop: 12,
  },
  bigBarFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },

  sectionTitle: {
    color: colors.mutedText,
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  empty: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
  },

  dayRow: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(50,73,86,0.40)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 10,
  },
  dayLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  dayInfo: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "800",
  },

  barBackground: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(43,62,74,0.35)",
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.success,
  },
});
