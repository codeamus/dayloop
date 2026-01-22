// app/(tabs)/index.tsx
import { container } from "@/core/di/container";
import { rescheduleHabitNotificationsForHabit } from "@/core/notifications/notifications";
import { Screen } from "@/presentation/components/Screen";
import { StatusPill } from "@/presentation/components/StatusPill";
import { useNotificationPermission } from "@/presentation/hooks/useNotificationPermission";
import { useTodayHabits } from "@/presentation/hooks/useTodayHabits";
import { colors } from "@/theme/colors";
import { addMinutesHHmm } from "@/utils/time";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type TimeTab = "all" | "morning" | "afternoon" | "evening";

function hhmmToMinutes(hhmm?: string): number {
  if (!hhmm) return Number.POSITIVE_INFINITY;
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m))
    return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.min(23, h)) * 60 + Math.max(0, Math.min(59, m));
}

function formatBlock(h: any): string | null {
  // Si es modo puntual, no mostrar bloque de tiempo
  if (h?.mode === "puntual") {
    return null;
  }

  // Si tiene timeBlocks, mostrar el primer bloque
  if (Array.isArray(h?.timeBlocks) && h.timeBlocks.length > 0) {
    const firstBlock = h.timeBlocks[0];
    return `${firstBlock.startTime}–${firstBlock.endTime}`;
  }

  // Legacy: usar startTime/endTime
  const start = h?.startTime ?? h?.time ?? undefined;
  const end = h?.endTime ?? (start ? addMinutesHHmm(start, 30) : undefined);

  if (!start && !end) return null;
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  return null;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toLocalYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function TodayScreen() {
  const { loading, habits, toggle } = useTodayHabits();
  const [timeTab, setTimeTab] = useState<TimeTab>("all");

  const { isGranted, requestPermission } = useNotificationPermission();
  const shouldShowNotificationPrompt = !isGranted && habits.length > 0;

  // Re-agenda weekly/monthly Android al entrar al Home
  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const all = await container.getAllHabits.execute();
          // Re-agendar notificaciones para todos los hábitos
          for (const habit of all) {
            if (habit.reminderOffsetMinutes !== null || (habit.reminderTimes && habit.reminderTimes.length > 0)) {
              await rescheduleHabitNotificationsForHabit(habit, { horizonDays: 30 });
            }
          }
        } catch {
          // ignore
        }
      })();
      return () => {};
    }, [])
  );

  // ✅ Global (sin filtros)
  const totalToday = habits.length;
  const doneToday = useMemo(
    () => habits.filter((h) => h.done).length,
    [habits]
  );
  const pendingToday = totalToday - doneToday;
  const progressPct =
    totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;

  // ✅ Filtrado por momento del día
  const filtered = useMemo(() => {
    const list = habits.filter((h) => {
      if (timeTab === "all") return true;
      return h.timeOfDay === timeTab;
    });

    return [...list].sort((a, b) => {
      const aMin = hhmmToMinutes(a.startTime ?? a.time ?? undefined);
      const bMin = hhmmToMinutes(b.startTime ?? b.time ?? undefined);
      return aMin - bMin;
    });
  }, [habits, timeTab]);

  const pending = filtered.filter((h) => !h.done);
  const completed = filtered.filter((h) => h.done);

  // ✅ Resumen semanal (últimos 7 días) sin navegar a [id]
  const [weekDoneDays, setWeekDoneDays] = useState<number>(0); // días con >=1 hábito completado
  const [weekTotalDone, setWeekTotalDone] = useState<number>(0); // total completados en 7 días
  const [weekLoading, setWeekLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setWeekLoading(true);
      try {
        const today = new Date();
        const days: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          days.push(toLocalYMD(d));
        }
        const daySet = new Set(days);

        // Traer logs y contar completados en los últimos 7 días
        const logs = await (container as any).habitLogRepository?.listAll?.();

        if (cancelled) return;

        if (!Array.isArray(logs)) {
          setWeekDoneDays(0);
          setWeekTotalDone(0);
          return;
        }

        let totalDone = 0;
        const doneDates = new Set<string>();

        for (const l of logs) {
          const date = l?.date; // "YYYY-MM-DD"
          const done = !!l?.done;
          if (!done || !date || !daySet.has(date)) continue;
          totalDone += 1;
          doneDates.add(date);
        }

        setWeekTotalDone(totalDone);
        setWeekDoneDays(doneDates.size);
      } catch {
        if (!cancelled) {
          setWeekDoneDays(0);
          setWeekTotalDone(0);
        }
      } finally {
        if (!cancelled) setWeekLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [habits]); // refresca al cambiar estado (toggle)

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
        <View>
          <Text style={styles.headerTitle}>Hoy</Text>
          <View style={{ marginTop: 6 }}>
            {pendingToday > 0 ? (
              <StatusPill
                variant="pending"
                text={`${pendingToday} pendiente${
                  pendingToday === 1 ? "" : "s"
                } hoy`}
              />
            ) : (
              <StatusPill variant="ok" text="Todo listo por hoy" />
            )}
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/habit-new")}
          style={styles.headerCta}
          hitSlop={8}
        >
          <Text style={styles.headerCtaText}>+ Nuevo</Text>
        </Pressable>
      </View>

      {shouldShowNotificationPrompt && (
        <View style={styles.notificationBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.notificationTitle}>Activa recordatorios</Text>
            <Text style={styles.notificationText}>
              Dayloop usa notificaciones para ayudarte a mantener tus hábitos.
            </Text>
          </View>

          <Pressable onPress={requestPermission} style={styles.notificationButton}>
            <Text style={styles.notificationButtonText}>Activar</Text>
          </Pressable>
        </View>
      )}

      {/* ✅ RESUMENES (sin links) */}
      <View style={styles.summaryGrid}>
        {/* Resumen día */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumen de hoy</Text>

          <Text style={styles.summaryBig}>
            {doneToday}/{totalToday}
            <Text style={styles.summarySmall}> completados</Text>
          </Text>

          <ProgressBar value={progressPct} />

          <View style={styles.summaryHintWrap}>
            {totalToday === 0 ? (
              <Text style={styles.summaryHintText}>
                Crea tu primer hábito para empezar.
              </Text>
            ) : pendingToday > 0 ? (
              <View style={styles.inlineRow}>
                <Feather name="clock" size={14} color={colors.mutedText} />
                <Text style={styles.summaryHintText}>
                  Te faltan {pendingToday} para cerrar el día.
                </Text>
              </View>
            ) : (
              <View style={styles.inlineRow}>
                <Feather name="zap" size={14} color={colors.primary} />
                <Text style={styles.summaryHintText}>
                  Día completo. Mantén la racha
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Resumen semana */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Últimos 7 días</Text>

          {weekLoading ? (
            <View style={{ marginTop: 10 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.summaryHintText, { marginTop: 8 }]}>
                Calculando…
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.summaryBig}>
                {weekDoneDays}
                <Text style={styles.summarySmall}> días activos</Text>
              </Text>

              <Text style={[styles.summaryHintText, { marginTop: 10 }]}>
                {weekTotalDone > 0
                  ? `Marcaste ${weekTotalDone} completados en la semana.`
                  : "Aún no completas hábitos esta semana."}
              </Text>

              <View style={styles.weekMiniRow}>
                <View style={styles.weekPill}>
                  <View style={styles.weekPillRow}>
                    <Feather name="activity" size={14} color={colors.text} />
                    <Text style={styles.weekPillText}>{weekDoneDays}/7</Text>
                  </View>
                </View>

                <View style={styles.weekPill}>
                  <View style={styles.weekPillRow}>
                    <Feather
                      name="check-circle"
                      size={14}
                      color={colors.text}
                    />
                    <Text style={styles.weekPillText}>{weekTotalDone}</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Filtro por momento del día */}
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
        <SectionTitle title="Pendientes" />
        {pending.length === 0 ? (
          <Text style={styles.emptyText}>
            No tienes hábitos pendientes hoy en esta vista.
          </Text>
        ) : (
          pending.map((h, index) => {
            const block = formatBlock(h);

            return (
              <Pressable
                key={`${h.id}-${index}`}
                style={styles.habitCard}
                onPress={() => toggle(h.id)} // ✅ solo completar
              >
                <View
                  style={[
                    styles.habitDot,
                    { backgroundColor: h.color || colors.primary },
                  ]}
                />

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.habitNameRow}>
                    <Text style={styles.habitText}>{h.name}</Text>
                    {(h.targetRepeats ?? 1) > 1 && (
                      <Text style={styles.progressIndicator}>
                        {h.progress ?? 0}/{h.targetRepeats ?? 1}
                      </Text>
                    )}
                  </View>

                  {!!block && (
                    <View style={styles.blockPill}>
                      <Text style={styles.blockPillText}>{block}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.habitRight}>
                  <Text style={styles.habitHint}>
                    {(h.targetRepeats ?? 1) > 1 && (h.progress ?? 0) < (h.targetRepeats ?? 1)
                      ? `${h.progress ?? 0}/${h.targetRepeats ?? 1}`
                      : "Tocar"}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}

        {/* Completados */}
        <View style={{ marginTop: 16 }} />
        <SectionTitle title="Completados" />
        {completed.length === 0 ? (
          <Text style={styles.emptyText}>
            Aún no completas hábitos en esta vista.
          </Text>
        ) : (
          completed.map((h, index) => {
            const block = formatBlock(h);

            return (
              <Pressable
                key={`${h.id}-${index}`}
                style={[styles.habitCard, styles.habitCardDone]}
                onPress={() => toggle(h.id)} // ✅ permite desmarcar
              >
                <View style={styles.checkCircle}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.habitNameRow}>
                    <Text style={[styles.habitText, styles.habitTextDone]}>
                      {h.name}
                    </Text>
                    {(h.targetRepeats ?? 1) > 1 && (
                      <Text style={[styles.progressIndicator, styles.progressIndicatorDone]}>
                        {h.progress ?? 0}/{h.targetRepeats ?? 1}
                      </Text>
                    )}
                  </View>

                  {!!block && (
                    <View style={[styles.blockPill, styles.blockPillDone]}>
                      <Text
                        style={[styles.blockPillText, styles.blockPillTextDone]}
                      >
                        {block}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.habitRight}>
                  <Text style={[styles.habitHint, styles.habitHintDone]}>
                    {(h.targetRepeats ?? 1) > 1
                      ? `${h.progress ?? 0}/${h.targetRepeats ?? 1}`
                      : "Listo"}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}

        {/* CTA abajo */}
        <View style={styles.createWrapper}>
          <Pressable
            style={styles.createButton}
            onPress={() => router.push("/habit-new")}
          >
            <Text style={styles.createText}>Crear hábito</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

/* --------- Subcomponentes --------- */

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${v}%` }]} />
    </View>
  );
}

type ChipProps = { label: string; active: boolean; onPress: () => void };

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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: colors.mutedText, fontSize: 13 },

  header: {
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  headerCta: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(230,188,1,0.14)",
    borderWidth: 1,
    borderColor: "rgba(230,188,1,0.35)",
  },
  headerCtaText: { color: colors.primary, fontWeight: "800", fontSize: 13 },

  notificationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: "rgba(230,188,1,0.12)",
    borderWidth: 1,
    borderColor: "rgba(230,188,1,0.35)",
  },
  notificationTitle: { color: colors.text, fontSize: 14, fontWeight: "800" },
  notificationText: { color: colors.mutedText, fontSize: 12, marginTop: 2 },
  notificationButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  notificationButtonText: { color: colors.bg, fontSize: 13, fontWeight: "900" },

  // ✅ Summary
  summaryGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    backgroundColor: "rgba(50,73,86,0.35)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    color: "rgba(241,233,215,0.75)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  summaryBig: {
    marginTop: 8,
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  summarySmall: {
    color: "rgba(241,233,215,0.75)",
    fontSize: 12,
    fontWeight: "800",
  },
  summaryHintWrap: {
    marginTop: 10,
    minHeight: 34,
    justifyContent: "center",
  },

  inlineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },

  summaryHintText: {
    flex: 1,
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    paddingTop: 1,
  },

  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.14)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(230,188,1,0.65)",
  },

  weekMiniRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  weekPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(43,62,74,0.35)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  weekPillText: { color: colors.text, fontWeight: "900", fontSize: 12 },

  filterRow: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(43,62,74,0.20)",
  },
  chipActive: {
    backgroundColor: "rgba(241,233,215,0.10)",
    borderColor: "rgba(241,233,215,0.18)",
  },
  chipText: { fontSize: 12, color: colors.text, fontWeight: "600" },
  chipTextActive: { color: colors.text, fontWeight: "800" },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  sectionTitle: {
    color: colors.mutedText,
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  emptyText: {
    color: colors.mutedText,
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },

  habitCard: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: "rgba(50,73,86,0.55)",
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  habitCardDone: { backgroundColor: "rgba(50,73,86,0.35)" },

  habitDot: { width: 10, height: 10, borderRadius: 999 },
  habitNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  habitText: { color: colors.text, fontSize: 15, fontWeight: "800" },
  habitTextDone: {
    color: "rgba(241,233,215,0.75)",
    textDecorationLine: "line-through",
  },
  progressIndicator: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    backgroundColor: "rgba(230,188,1,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(230,188,1,0.30)",
  },
  progressIndicatorDone: {
    color: colors.success,
    backgroundColor: "rgba(142,205,110,0.15)",
    borderColor: "rgba(142,205,110,0.30)",
  },
  habitRight: { minWidth: 44, alignItems: "flex-end" },
  habitHint: { color: colors.mutedText, fontSize: 12, fontWeight: "700" },
  habitHintDone: { color: "rgba(142,205,110,0.85)", fontWeight: "800" },

  blockPill: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.18)",
  },
  blockPillText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  blockPillDone: {
    backgroundColor: "rgba(142,205,110,0.10)",
    borderColor: "rgba(142,205,110,0.25)",
  },
  blockPillTextDone: { color: "rgba(241,233,215,0.75)" },

  createWrapper: { marginTop: 18 },
  createButton: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  createText: { color: colors.bg, fontSize: 15, fontWeight: "900" },

  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(142,205,110,0.14)",
    borderWidth: 1,
    borderColor: "rgba(142,205,110,0.45)",
  },
  checkIcon: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.success,
    marginTop: -1,
  },
});
