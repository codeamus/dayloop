// app/stats/index.tsx
import { HistorySectionList } from "@/presentation/components/HistorySectionList";
import { Screen } from "@/presentation/components/Screen";
import { useAllHabits } from "@/presentation/hooks/useAllHabits";
import { useFullHistory } from "@/presentation/hooks/useFullHistory";
import { useGlobalStreaks } from "@/presentation/hooks/useGlobalStreaks";
import {
  useFirstCompletedHabitDate,
  useHasCompletedHabits,
} from "@/presentation/hooks/useHasCompletedHabits";
import { useWeeklySummary } from "@/presentation/hooks/useWeeklySummary";
import { colors } from "@/theme/colors";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

/**
 * Componente Empty State para cuando no hay datos de estadísticas
 */
function EmptyState({
  hasHabits,
  onGoToToday,
}: {
  hasHabits: boolean;
  onGoToToday: () => void;
}) {
  return (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIcon}>
        <Text style={styles.emptyStateEmoji}>📊</Text>
      </View>
      <Text style={styles.emptyStateTitle}>
        {hasHabits ? "¡Día 1 en marcha!" : "Crea tu primer hábito"}
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {hasHabits
          ? "Completa tu primer hábito hoy para empezar a ver tu racha y progreso."
          : "Comienza tu viaje creando tu primer hábito y empieza a construir tu rutina diaria."}
      </Text>
      {hasHabits && (
        <Pressable onPress={onGoToToday} style={styles.emptyStateButton}>
          <Text style={styles.emptyStateButtonText}>Ir a Hoy</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function StatsScreen() {
  const [viewMode, setViewMode] = useState<"summary" | "history">("summary");
  
  // Estado para navegación de semanas
  const [weekOffset, setWeekOffset] = useState(0);
  
  // Calcular fecha de referencia basada en el offset
  const referenceDate = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + weekOffset * 7);
    
    const y = targetDate.getFullYear();
    const m = String(targetDate.getMonth() + 1).padStart(2, "0");
    const d = String(targetDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [weekOffset]);
  
  const { loading, days, error, reload } = useWeeklySummary(referenceDate);
  const {
    history,
    loading: historyLoading,
    loadingMore,
    loadMore,
    reload: reloadHistory,
  } = useFullHistory();
  const { habits } = useAllHabits();
  const { streaks: globalStreaks, refresh: refreshStreaks } = useGlobalStreaks();
  const { hasCompleted: hasEverCompletedHabit } = useHasCompletedHabits();
  const { firstDate: firstCompletedDate } = useFirstCompletedHabitDate();

  // Refresco automático cuando la pantalla entra en foco
  useFocusEffect(
    useCallback(() => {
      if (viewMode === "summary") {
        reload();
        refreshStreaks(); // Refrescar rachas también
      } else {
        reloadHistory();
      }
    }, [viewMode, reload, reloadHistory, refreshStreaks])
  );

  // Pull-to-refresh: no queremos bloquear la pantalla completa
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      if (viewMode === "summary") {
        await reload();
      } else {
        await reloadHistory();
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Calcular el límite mínimo de navegación (semana del primer hábito completado)
  const minWeekOffset = useMemo(() => {
    // Si no hay hábitos creados, no permitir navegar hacia atrás
    if (habits.length === 0) return 0;

    // Si no hay fecha de primer hábito completado, no permitir navegar hacia atrás
    if (!firstCompletedDate) return 0;

    // Obtener el lunes de la semana del primer hábito completado
    const firstDate = parseLocalYMDNoon(firstCompletedDate);
    const firstDateDay = firstDate.getDay(); // 0-6 (Dom-Sáb)
    const daysToMonday = firstDateDay === 0 ? 6 : firstDateDay - 1; // Días hasta el lunes
    const mondayOfFirstWeek = new Date(firstDate);
    mondayOfFirstWeek.setDate(firstDate.getDate() - daysToMonday);
    mondayOfFirstWeek.setHours(12, 0, 0, 0);

    // Obtener el lunes de la semana actual
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayDay = today.getDay();
    const daysToMondayToday = todayDay === 0 ? 6 : todayDay - 1;
    const mondayOfCurrentWeek = new Date(today);
    mondayOfCurrentWeek.setDate(today.getDate() - daysToMondayToday);
    mondayOfCurrentWeek.setHours(12, 0, 0, 0);

    // Calcular diferencia en semanas (negativa porque vamos hacia atrás)
    const diffMs = mondayOfFirstWeek.getTime() - mondayOfCurrentWeek.getTime();
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));

    return diffWeeks;
  }, [firstCompletedDate, habits.length]);

  // Navegación de semanas con límite
  const handlePreviousWeek = useCallback(() => {
    setWeekOffset((prev) => {
      const newOffset = prev - 1;
      // Si el nuevo offset es menor que el mínimo, no permitir
      if (newOffset < minWeekOffset) {
        return prev; // Mantener el offset actual
      }
      return newOffset;
    });
  }, [minWeekOffset]);

  const handleNextWeek = useCallback(() => {
    setWeekOffset((prev) => Math.min(prev + 1, 0)); // No permitir ir más adelante que hoy
  }, []);

  const handleResetToCurrent = useCallback(() => {
    setWeekOffset(0);
  }, []);

  // Verificar si se puede navegar hacia atrás
  const canGoBack = weekOffset > minWeekOffset;

  const handleLoadMore = useCallback(() => {
    loadMore();
  }, [loadMore]);

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

  const hasAnyHabits = habits.length > 0;
  
  // Verificar si el historial está vacío (sin hábitos completados en toda la historia)
  const hasHistoryData = useMemo(() => {
    if (!history || history.months.length === 0) return false;
    return history.months.some(
      (month) =>
        month.weeks.length > 0 &&
        month.weeks.some(
          (week) =>
            week.days.length > 0 &&
            week.days.some((day) => day.totalDone > 0)
        )
    );
  }, [history]);

  // Verificar si hay hábitos completados en la semana actual
  const hasCompletedHabitsInWeek = computed.weekDone > 0;
  
  // Solo mostrar empty state si NUNCA ha completado un hábito en toda su historia
  // hasEverCompletedHabit es null mientras carga, así que usamos hasHistoryData como fallback
  const hasEverCompleted = hasEverCompletedHabit ?? hasHistoryData;
  const shouldShowEmptyState = !hasEverCompleted && !hasCompletedHabitsInWeek;

  const handleGoToToday = useCallback(() => {
    router.replace("/(tabs)/");
  }, []);

  // Animación suave al montar / cambiar viewMode
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
  }, [viewMode, days.length, fade, translate]);

  // Loader solo para el primer load (cuando aún no hay nada)
  if (
    (viewMode === "summary" && loading && days.length === 0) ||
    (viewMode === "history" && historyLoading && !history)
  ) {
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
          onPress={onRefresh}
          style={[
            styles.refreshButton,
            (loading || historyLoading) && { opacity: 0.7 },
          ]}
          hitSlop={10}
          disabled={loading || historyLoading}
        >
          <Text style={styles.refreshText}>↻</Text>
        </Pressable>
      </View>

      {/* Selector de vista */}
      <View style={styles.viewModeSegment}>
        <Pressable
          onPress={() => setViewMode("summary")}
          style={[
            styles.viewModeBtn,
            viewMode === "summary" && styles.viewModeBtnActive,
          ]}
        >
          <Text
            style={[
              styles.viewModeText,
              viewMode === "summary" && styles.viewModeTextActive,
            ]}
          >
            Resumen
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode("history")}
          style={[
            styles.viewModeBtn,
            viewMode === "history" && styles.viewModeBtnActive,
          ]}
        >
          <Text
            style={[
              styles.viewModeText,
              viewMode === "history" && styles.viewModeTextActive,
            ]}
          >
            Histórico
          </Text>
        </Pressable>
      </View>

      {/* ================= VISTA DE HISTÓRICO ================= */}
      {viewMode === "history" && (
        <>
          {!hasHistoryData && !historyLoading ? (
            <EmptyState
              hasHabits={hasAnyHabits}
              onGoToToday={handleGoToToday}
            />
          ) : (
            <HistorySectionList
              history={history}
              loading={historyLoading}
              loadingMore={loadingMore}
              onEndReached={handleLoadMore}
            />
          )}
        </>
      )}

      {/* ================= VISTA DE RESUMEN (SEMANA) ================= */}
      {viewMode === "summary" && (
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
          {shouldShowEmptyState && !loading ? (
            <EmptyState
              hasHabits={hasAnyHabits}
              onGoToToday={handleGoToToday}
            />
          ) : (
            <Animated.View
              style={{
                opacity: fade,
                transform: [{ translateY: translate }],
              }}
            >
              {/* Rango de fechas con navegación */}
              {!!rangeText && (
                <View style={styles.rangeContainer}>
                  <Pressable
                    onPress={handlePreviousWeek}
                    style={[
                      styles.rangeArrow,
                      !canGoBack && styles.rangeArrowDisabled,
                    ]}
                    hitSlop={8}
                    disabled={!canGoBack}
                  >
                    <Text
                      style={[
                        styles.rangeArrowText,
                        !canGoBack && styles.rangeArrowTextDisabled,
                      ]}
                    >
                      ‹
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleResetToCurrent}
                    style={styles.rangePill}
                    disabled={weekOffset === 0}
                  >
                    <Text
                      style={[
                        styles.rangeText,
                        weekOffset !== 0 && styles.rangeTextActive,
                      ]}
                    >
                      {rangeText}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleNextWeek}
                    style={styles.rangeArrow}
                    hitSlop={8}
                  >
                    <Text style={styles.rangeArrowText}>›</Text>
                  </Pressable>
                </View>
              )}

              {error && <Text style={styles.empty}>{error}</Text>}

              {/* Resumen global */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Esta semana (Lun–Dom)</Text>

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

                {/* Rachas globales */}
                <View style={styles.streaksRow}>
                  <View style={styles.streaksItem}>
                    <Text style={styles.streaksLabel}>Racha actual</Text>
                    <Text style={styles.streaksValue}>
                      {globalStreaks.currentDailyStreak} días
                    </Text>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.streaksItem}>
                    <Text style={styles.streaksLabel}>Mejor racha</Text>
                    <Text style={styles.streaksValue}>
                      {globalStreaks.bestDailyStreak} días
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
                const isRestDay = day.totalPlanned <= 0;

                return (
                  <View key={day.date} style={styles.dayRow}>
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayLabel}>{day.label}</Text>
                      {isRestDay ? (
                        <Text style={styles.dayRestLabel}>Descanso</Text>
                      ) : (
                        <Text style={styles.dayInfo}>
                          {day.totalDone}/{day.totalPlanned} ({pct}%)
                        </Text>
                      )}
                    </View>

                    {/* Barra por día animada */}
                    {isRestDay ? (
                      <View style={styles.restDayBar}>
                        <View style={[styles.restDayBarFill, { width: "100%" }]} />
                      </View>
                    ) : (
                      <AnimatedBar pct={pct} height={8} fillColor={colors.success} />
                    )}
                  </View>
                );
              })}
            </Animated.View>
          )}
        </ScrollView>
      )}
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

  viewModeSegment: {
    flexDirection: "row",
    gap: 8,
    padding: 6,
    borderRadius: 16,
    backgroundColor: "rgba(50,73,86,0.40)",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  viewModeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  viewModeBtnActive: {
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewModeText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "900",
  },
  viewModeTextActive: {
    color: colors.text,
  },

  rangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    width: "100%",
  },
  rangeArrow: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(43,62,74,0.25)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  rangeArrowText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  rangeArrowDisabled: {
    opacity: 0.3,
  },
  rangeArrowTextDisabled: {
    opacity: 0.5,
  },
  rangePill: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(43,62,74,0.25)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  rangeText: {
    color: "rgba(241,233,215,0.85)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  rangeTextActive: {
    color: colors.primary,
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
  dayRestLabel: {
    color: "rgba(241,233,215,0.60)",
    fontSize: 11,
    fontWeight: "800",
    fontStyle: "italic",
  },
  restDayBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(43,62,74,0.20)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.15)",
    overflow: "hidden",
  },
  restDayBarFill: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(241,233,215,0.10)",
  },
  streaksRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    gap: 12,
  },
  streaksItem: { flex: 1 },
  streaksLabel: {
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "900",
  },
  streaksValue: {
    marginTop: 4,
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
  },

  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    minHeight: 400,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(50,73,86,0.55)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyStateEmoji: {
    fontSize: 40,
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },
  emptyStateSubtitle: {
    color: colors.mutedText,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 300,
  },
  emptyStateButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emptyStateButtonText: {
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: "900",
  },
});
