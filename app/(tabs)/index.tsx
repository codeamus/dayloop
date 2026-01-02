// app/(tabs)/index.tsx
import { Screen } from "@/presentation/components/Screen";
import { useTodayHabits } from "@/presentation/hooks/useTodayHabits";
import { colors } from "@/theme/colors";
import { addMinutesHHmm } from "@/utils/time";
import { router } from "expo-router";
import { useMemo, useState } from "react";
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
  const start = h?.startTime ?? h?.time ?? null;
  const end = h?.endTime ?? (start ? addMinutesHHmm(start, 30) : null);

  if (!start && !end) return null;
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  return null;
}


export default function TodayScreen() {
  const { loading, habits, toggle } = useTodayHabits();

  const [frequencyTab, setFrequencyTab] = useState<FrequencyTab>("daily");
  const [timeTab, setTimeTab] = useState<TimeTab>("all");

  const filtered = useMemo(() => {
    // 1) Filtrar por frecuencia + timeOfDay
    const byFrequency = habits.filter((h) => h.scheduleType === frequencyTab);
    const byTime = byFrequency.filter((h) => {
      if (timeTab === "all") return true;
      return h.timeOfDay === timeTab;
    });

    // 2) Orden por startTime (si no hay, cae al final)
    return [...byTime].sort((a, b) => {
      const aMin = hhmmToMinutes(a.startTime ?? a.time);
      const bMin = hhmmToMinutes(b.startTime ?? b.time);
      return aMin - bMin;
    });
  }, [habits, frequencyTab, timeTab]);

  const pending = filtered.filter((h) => !h.done);
  const completed = filtered.filter((h) => h.done);

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
          <Text style={styles.headerSubtitle}>
            {pending.length > 0
              ? `${pending.length} pendiente${pending.length === 1 ? "" : "s"}`
              : "Todo listo por hoy ✅"}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/habit-new")}
          style={styles.headerCta}
          hitSlop={8}
        >
          <Text style={styles.headerCtaText}>+ Nuevo</Text>
        </Pressable>
      </View>

      {/* Fila 1 */}
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

      {/* Fila 2 */}
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
            No tienes hábitos pendientes aquí.
          </Text>
        ) : (
          pending.map((h, index) => {
            const block = formatBlock(h);

            return (
              <Pressable
                key={`${h.id}-${index}`}
                style={styles.habitCard}
                onPress={() => toggle(h.id)}
              >
                <View
                  style={[
                    styles.habitDot,
                    { backgroundColor: h.color || colors.primary },
                  ]}
                />

                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.habitText}>{h.name}</Text>

                  {!!block && (
                    <View style={styles.blockPill}>
                      <Text style={styles.blockPillText}>{block}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.habitRight}>
                  <Text style={styles.habitHint}>Tocar</Text>
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
                onPress={() => toggle(h.id)}
              >
                <View
                  style={[styles.habitDot, { backgroundColor: colors.success }]}
                />

                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.habitText, styles.habitTextDone]}>
                    {h.name}
                  </Text>

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
                    Listo
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

type SegmentProps = { label: string; active: boolean; onPress: () => void };

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
  headerSubtitle: { marginTop: 2, color: colors.mutedText, fontSize: 13 },
  headerCta: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(230,188,1,0.14)",
    borderWidth: 1,
    borderColor: "rgba(230,188,1,0.35)",
  },
  headerCtaText: { color: colors.primary, fontWeight: "800", fontSize: 13 },

  topTabs: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 4,
    marginBottom: 12,
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: "rgba(230,188,1,0.16)",
    borderWidth: 1,
    borderColor: "rgba(230,188,1,0.40)",
  },
  segmentText: { fontSize: 13, color: colors.mutedText, fontWeight: "700" },
  segmentTextActive: { color: colors.primary },

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
  habitText: { color: colors.text, fontSize: 15, fontWeight: "800" },
  habitTextDone: {
    color: "rgba(241,233,215,0.75)",
    textDecorationLine: "line-through",
  },
  habitRight: { minWidth: 44, alignItems: "flex-end" },
  habitHint: { color: colors.mutedText, fontSize: 12, fontWeight: "700" },
  habitHintDone: { color: colors.success },

  // ✅ NUEVO: pill del bloque horario
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
  blockPillText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
  blockPillDone: {
    backgroundColor: "rgba(142,205,110,0.10)",
    borderColor: "rgba(142,205,110,0.25)",
  },
  blockPillTextDone: {
    color: "rgba(241,233,215,0.75)",
  },

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
});
