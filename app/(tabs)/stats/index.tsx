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

function clamp(n: number, min = 0, max = 100) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function toPct(rate: number) {
  // rate esperado 0..1
  if (!Number.isFinite(rate)) return 0;
  return clamp(Math.round(rate * 100), 0, 100);
}

export default function StatsScreen() {
  const { loading, days, error } = useWeeklySummary();

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

  // Solo días donde efectivamente había hábitos planificados
  const daysWithHabits = days.filter((d) => (d.totalPlanned ?? 0) > 0);

  const overallRate =
    daysWithHabits.length === 0
      ? 0
      : daysWithHabits.reduce((acc, d) => acc + (d.completionRate ?? 0), 0) /
        daysWithHabits.length;

  const overallPct = toPct(overallRate);

  const weekPlanned = daysWithHabits.reduce(
    (acc, d) => acc + (d.totalPlanned ?? 0),
    0
  );
  const weekDone = daysWithHabits.reduce(
    (acc, d) => acc + (d.totalDone ?? 0),
    0
  );

  const bestDay =
    daysWithHabits.length === 0
      ? null
      : daysWithHabits.reduce((best, cur) => {
          const bestPct = toPct(best.completionRate ?? 0);
          const curPct = toPct(cur.completionRate ?? 0);
          if (curPct > bestPct) return cur;
          if (curPct < bestPct) return best;
          // empate: el que tenga más hábitos hechos
          return (cur.totalDone ?? 0) > (best.totalDone ?? 0) ? cur : best;
        }, daysWithHabits[0]);

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
      {error && <Text style={styles.empty}>{error}</Text>}

      {/* Resumen global */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Últimos 7 días</Text>

        <View style={styles.bigRow}>
          <Text style={styles.cardMainValue}>{overallPct}%</Text>
          <View style={styles.bigRight}>
            <Text style={styles.bigHint}>Promedio</Text>
            <Text style={styles.bigSubHint}>
              {daysWithHabits.length === 0
                ? "(sin días con hábitos planificados)"
                : "(solo días con hábitos planificados)"}
            </Text>
          </View>
        </View>

        <View style={styles.bigBarBackground}>
          <View style={[styles.bigBarFill, { width: `${overallPct}%` }]} />
        </View>

        {/* Mini resumen (simple y útil) */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Semana</Text>
            <Text style={styles.summaryValue}>
              {weekDone}/{weekPlanned}
            </Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Mejor día</Text>
            <Text style={styles.summaryValue}>
              {bestDay
                ? `${bestDay.label} (${toPct(bestDay.completionRate)}%)`
                : "—"}
            </Text>
          </View>
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
        const planned = day.totalPlanned ?? 0;
        const done = day.totalDone ?? 0;

        // Si no hay planificados, que sea 0% sí o sí (evita NaN)
        const pct = planned <= 0 ? 0 : toPct(day.completionRate ?? 0);

        return (
          <View key={day.date} style={styles.dayRow}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              <Text style={styles.dayInfo}>
                {done}/{planned} ({pct}%)
              </Text>
            </View>

            <View style={styles.barBackground}>
              <View style={[styles.barFill, { width: `${pct}%` }]} />
            </View>

            {planned <= 0 && (
              <Text style={styles.dayMuted}>Sin hábitos planificados</Text>
            )}
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

  summaryRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryItem: { flex: 1 },
  summaryLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  summaryValue: {
    marginTop: 4,
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  summaryDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.border,
    opacity: 0.9,
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
  dayMuted: {
    marginTop: 8,
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "800",
  },
});
