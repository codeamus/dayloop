// app/stats/index.tsx
import { Screen } from "@/presentation/components/Screen";
import {
  useWeeklySummary,
  type WeekPreset,
} from "@/presentation/hooks/useWeeklySummary";
import { colors } from "@/theme/colors";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

function clamp(n: number, min = 0, max = 100) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function toPct(rate: number) {
  if (!Number.isFinite(rate)) return 0;
  return clamp(Math.round(rate * 100), 0, 100);
}

function parseLocalYMDNoon(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

function formatShortDate(dateStr: string) {
  // "01 ene"
  const d = parseLocalYMDNoon(dateStr);
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
  }).format(d);
}

function formatRange(fromYmd?: string, toYmd?: string) {
  if (!fromYmd || !toYmd) return "";
  return `${formatShortDate(fromYmd)} – ${formatShortDate(toYmd)}`;
}

/**
 * Barra animada por porcentaje (0..100)
 */
function AnimatedBar({
  pct,
  height,
  fillColor,
}: {
  pct: number;
  height: number;
  fillColor: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamp(pct, 0, 100),
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width no soporta native driver
    }).start();
  }, [pct, anim]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.barBackground, { height }]}>
      <Animated.View
        style={[styles.barFill, { width, height, backgroundColor: fillColor }]}
      />
    </View>
  );
}

export default function StatsScreen() {
  const [preset, setPreset] = useState<WeekPreset>("current");
  const { loading, days, error, reload } = useWeeklySummary(preset);

  // Pull-to-refresh: no queremos bloquear la pantalla completa
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await reload();
    } finally {
      setRefreshing(false);
    }
  };

  const rangeText = useMemo(() => {
    if (!days?.length) return "";
    return formatRange(days[0]?.date, days[days.length - 1]?.date);
  }, [days]);

  const computed = useMemo(() => {
    const daysWithHabits = days.filter((d) => d.totalPlanned > 0);

    const overallRate =
      daysWithHabits.length === 0
        ? 0
        : daysWithHabits.reduce((acc, d) => acc + d.completionRate, 0) /
          daysWithHabits.length;

    const overallPct = toPct(overallRate);

    const weekPlanned = daysWithHabits.reduce(
      (acc, d) => acc + d.totalPlanned,
      0
    );
    const weekDone = daysWithHabits.reduce((acc, d) => acc + d.totalDone, 0);

    const bestDay =
      daysWithHabits.length === 0
        ? null
        : daysWithHabits.reduce((best, cur) => {
            const bestPct = toPct(best.completionRate);
            const curPct = toPct(cur.completionRate);
            if (curPct > bestPct) return cur;
            if (curPct < bestPct) return best;
            return cur.totalDone > best.totalDone ? cur : best;
          }, daysWithHabits[0]);

    return { overallPct, weekPlanned, weekDone, bestDay };
  }, [days]);

  // Animación suave al montar / cambiar preset
  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    fade.setValue(0);
    translate.setValue(8);

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [preset, days.length, fade, translate]);

  // Loader solo para el primer load (cuando aún no hay nada)
  if (loading && days.length === 0) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Calculando estadísticas…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* ================= HEADER (FIJO) ================= */}
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

        <Pressable
          onPress={reload}
          style={[styles.refreshButton, loading && { opacity: 0.7 }]}
          hitSlop={10}
          disabled={loading}
        >
          <Text style={styles.refreshText}>↻</Text>
        </Pressable>
      </View>

      {/* ================= CONTENIDO SCROLL ================= */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <Animated.View
          style={{
            opacity: fade,
            transform: [{ translateY: translate }],
          }}
        >
          {/* Selector semana */}
          <View style={styles.segment}>
            <Pressable
              onPress={() => setPreset("current")}
              style={[
                styles.segmentBtn,
                preset === "current" && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  preset === "current" && styles.segmentTextActive,
                ]}
              >
                Semana actual
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setPreset("previous")}
              style={[
                styles.segmentBtn,
                preset === "previous" && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  preset === "previous" && styles.segmentTextActive,
                ]}
              >
                Semana anterior
              </Text>
            </Pressable>
          </View>

          {/* Rango de fechas */}
          {!!rangeText && (
            <View style={styles.rangePill}>
              <Text style={styles.rangeText}>{rangeText}</Text>
            </View>
          )}

          {error && <Text style={styles.empty}>{error}</Text>}

          {/* Resumen global */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {preset === "current"
                ? "Esta semana (Lun–Dom)"
                : "Semana anterior (Lun–Dom)"}
            </Text>

            <View style={styles.bigRow}>
              <Text style={styles.cardMainValue}>{computed.overallPct}%</Text>

              <View style={styles.bigRight}>
                <Text style={styles.bigHint}>Promedio</Text>
                <Text style={styles.bigSubHint}>
                  (solo días con hábitos planificados)
                </Text>
              </View>
            </View>

            {/* Barra grande animada */}
            <View style={styles.bigBarBackground}>
              <AnimatedBar
                pct={computed.overallPct}
                height={10}
                fillColor={colors.primary}
              />
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Semana</Text>
                <Text style={styles.summaryValue}>
                  {computed.weekDone}/{computed.weekPlanned}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Mejor día</Text>
                <Text style={styles.summaryValue}>
                  {computed.bestDay
                    ? `${computed.bestDay.label} (${toPct(
                        computed.bestDay.completionRate
                      )}%)`
                    : "—"}
                </Text>
              </View>
            </View>
          </View>

          {/* Detalle por día */}
          <Text style={styles.sectionTitle}>Detalle por día</Text>

          {days.length === 0 && (
            <Text style={styles.empty}>
              Aún no hay datos suficientes para mostrar estadísticas.
            </Text>
          )}

          {days.map((day) => {
            const pct = day.totalPlanned <= 0 ? 0 : toPct(day.completionRate);

            return (
              <View key={day.date} style={styles.dayRow}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{day.label}</Text>
                  <Text style={styles.dayInfo}>
                    {day.totalDone}/{day.totalPlanned} ({pct}%)
                  </Text>
                </View>

                {/* Barra por día animada */}
                <AnimatedBar pct={pct} height={8} fillColor={colors.success} />

                {day.totalPlanned <= 0 && (
                  <Text style={styles.dayMuted}>Sin hábitos planificados</Text>
                )}
              </View>
            );
          })}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: colors.mutedText, fontSize: 13 },

  scrollContent: {
    paddingBottom: 28,
  },

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

  refreshButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(50,73,86,0.40)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshText: { color: colors.text, fontSize: 16, fontWeight: "900" },

  segment: {
    flexDirection: "row",
    gap: 8,
    padding: 6,
    borderRadius: 16,
    backgroundColor: "rgba(50,73,86,0.40)",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentText: { color: colors.mutedText, fontSize: 12, fontWeight: "900" },
  segmentTextActive: { color: colors.text },

  rangePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(43,62,74,0.25)",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  rangeText: {
    color: "rgba(241,233,215,0.85)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },

  card: {
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
  },

  bigRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    gap: 12,
  },
  cardMainValue: { color: colors.text, fontSize: 40, fontWeight: "900" },
  bigRight: { flex: 1, alignItems: "flex-end" },
  bigHint: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  bigSubHint: {
    color: "rgba(241,233,215,0.70)",
    fontSize: 11,
    marginTop: 2,
    textAlign: "right",
    fontWeight: "700",
  },

  bigBarBackground: {
    marginTop: 12,
  },

  summaryRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    gap: 12,
  },
  summaryItem: { flex: 1 },
  summaryLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "900",
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
  },
  empty: { color: colors.mutedText, fontSize: 12, lineHeight: 16 },

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
  dayLabel: { color: colors.text, fontSize: 13, fontWeight: "900" },
  dayInfo: { color: colors.mutedText, fontSize: 11, fontWeight: "800" },

  barBackground: {
    borderRadius: 999,
    backgroundColor: "rgba(43,62,74,0.35)",
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  barFill: {
    borderRadius: 999,
  },

  dayMuted: {
    marginTop: 8,
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "800",
  },
});
