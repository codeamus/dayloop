// app/(tabs)/index.tsx
import { Screen } from "@/presentation/components/Screen";
import { useTodayHabits } from "@/presentation/hooks/useTodayHabits";
import { colors } from "@/theme/colors";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";

/* ---------------- Types ---------------- */

type FrequencyTab = "daily" | "weekly" | "monthly";
type TimeTab = "all" | "morning" | "afternoon" | "evening";

/* ---------------- Utils ---------------- */

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
  const end = h?.endTime ?? null;
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  return null;
}

/* ---------------- Swipe Action ---------------- */

function SwipeAction({ done }: { done: boolean }) {
  const bg = done ? colors.danger : colors.success;
  const label = done ? "↺ Desmarcar" : "✔ Completar";

  return (
    <View style={[styles.swipeAction, { backgroundColor: bg }]}>
      <Text style={styles.swipeActionText}>{label}</Text>
    </View>
  );
}

/* ---------------- Row ---------------- */

type HabitRowProps = {
  h: any;
  done: boolean;
  block: string | null;
  onToggle: (id: string) => Promise<void>;
  onOpenHabit: (id: string) => void;
};

function HabitRow({ h, done, block, onToggle, onOpenHabit }: HabitRowProps) {
  const id = h.id;

  // ✅ ref por fila (sin ref global)
  const swipeRef = useRef<Swipeable | null>(null);

  // ✅ Anti tap-fantasma: cancela si el dedo se movió más que X px
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const MOVE_THRESHOLD_PX = 8; // prueba 6–10

  const onPressIn = useCallback((e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    startRef.current = { x: pageX, y: pageY };
    movedRef.current = false;
  }, []);

  const onTouchMove = useCallback((e: GestureResponderEvent) => {
    const start = startRef.current;
    if (!start) return;

    const { pageX, pageY } = e.nativeEvent;
    const dx = Math.abs(pageX - start.x);
    const dy = Math.abs(pageY - start.y);

    if (dx > MOVE_THRESHOLD_PX || dy > MOVE_THRESHOLD_PX) {
      movedRef.current = true;
    }
  }, []);

  const onPress = useCallback(() => {
    if (movedRef.current) return;
    onOpenHabit(id);
  }, [id, onOpenHabit]);

  const onSwipe = useCallback(async () => {
    try {
      await Haptics.notificationAsync(
        done
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );
      await onToggle(id);
    } finally {
      // ✅ cerrar siempre
      // @ts-ignore
      swipeRef.current?.close?.();
      // ✅ y bloquear que un “release” dispare tap
      movedRef.current = true;
      startRef.current = null;
    }
  }, [done, id, onToggle]);

  return (
    <Swipeable
      ref={(r) => {
        swipeRef.current = r;
      }}
      overshootRight={false}
      renderRightActions={() => <SwipeAction done={done} />}
      onSwipeableWillOpen={() => {
        // ✅ en cuanto empieza swipe, cancelamos tap
        movedRef.current = true;
      }}
      onSwipeableOpen={onSwipe}
      onSwipeableWillClose={() => {
        // al cerrar, seguimos cancelando tap del gesto actual
        movedRef.current = true;
      }}
      onSwipeableClose={() => {
        // listo, siguiente gesto puede contar de nuevo
        startRef.current = null;
        movedRef.current = false;
      }}
    >
      <Pressable
        style={[styles.habitCard, done && styles.habitCardDone]}
        onPressIn={onPressIn}
        onTouchMove={onTouchMove}
        onPress={onPress}
      >
        <View
          style={[
            styles.habitDot,
            { backgroundColor: done ? colors.success : h.color },
          ]}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.habitText, done && styles.habitTextDone]}>
            {h.name}
          </Text>

          {block && (
            <View style={[styles.blockPill, done && styles.blockPillDone]}>
              <Text
                style={[styles.blockPillText, done && styles.blockPillTextDone]}
              >
                {block}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Swipeable>
  );
}

/* ---------------- Screen ---------------- */

export default function TodayScreen() {
  const { loading, habits, toggle } = useTodayHabits();

  const [frequencyTab, setFrequencyTab] = useState<FrequencyTab>("daily");
  const [timeTab, setTimeTab] = useState<TimeTab>("all");

  const filtered = useMemo(() => {
    const byFrequency = habits.filter((h) => h.scheduleType === frequencyTab);
    const byTime = byFrequency.filter((h) =>
      timeTab === "all" ? true : h.timeOfDay === timeTab
    );

    return [...byTime].sort(
      (a, b) =>
        hhmmToMinutes(a.startTime ?? a.time) -
        hhmmToMinutes(b.startTime ?? b.time)
    );
  }, [habits, frequencyTab, timeTab]);

  const pending = filtered.filter((h) => !h.done);
  const completed = filtered.filter((h) => h.done);

  const navLockRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      navLockRef.current = false;
      return () => {};
    }, [])
  );

  const safePushHabit = useCallback((habitId: string) => {
    if (navLockRef.current) return;
    navLockRef.current = true;

    router.push(`/(tabs)/habits/${habitId}`);

    setTimeout(() => {
      navLockRef.current = false;
    }, 600);
  }, []);

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
        >
          <Text style={styles.headerCtaText}>+ Nuevo</Text>
        </Pressable>
      </View>

      {/* TABS */}
      <View style={styles.topTabs}>
        {["daily", "weekly", "monthly"].map((t) => (
          <Pressable
            key={t}
            onPress={() => setFrequencyTab(t as FrequencyTab)}
            style={[styles.segment, frequencyTab === t && styles.segmentActive]}
          >
            <Text
              style={[
                styles.segmentText,
                frequencyTab === t && styles.segmentTextActive,
              ]}
            >
              {t === "daily"
                ? "Diario"
                : t === "weekly"
                ? "Semanal"
                : "Mensual"}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.filterRow}>
        {[
          ["all", "Todos"],
          ["morning", "Mañana"],
          ["afternoon", "Tarde"],
          ["evening", "Noche"],
        ].map(([k, l]) => (
          <Pressable
            key={k}
            onPress={() => setTimeTab(k as TimeTab)}
            style={[styles.chip, timeTab === k && styles.chipActive]}
          >
            <Text
              style={[styles.chipText, timeTab === k && styles.chipTextActive]}
            >
              {l}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionTitle title="Pendientes" />
        {pending.map((h) => (
          <HabitRow
            key={`${h.id}-pending`}
            h={h}
            done={false}
            block={formatBlock(h)}
            onToggle={toggle}
            onOpenHabit={safePushHabit}
          />
        ))}

        <SectionTitle title="Completados" />
        {completed.map((h) => (
          <HabitRow
            key={`${h.id}-done`}
            h={h}
            done
            block={formatBlock(h)}
            onToggle={toggle}
            onOpenHabit={safePushHabit}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: colors.mutedText },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.mutedText },
  headerCta: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(230,188,1,0.15)",
  },
  headerCtaText: { color: colors.primary, fontWeight: "800" },

  topTabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceOverlay,
    borderRadius: 999,
    padding: 4,
    marginBottom: 12,
  },
  segment: { flex: 1, alignItems: "center", paddingVertical: 8 },
  segmentActive: {
    backgroundColor: "rgba(230,188,1,0.18)",
    borderRadius: 999,
  },
  segmentText: { color: colors.mutedText },
  segmentTextActive: { color: colors.primary, fontWeight: "800" },

  filterRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: "rgba(241,233,215,0.1)" },
  chipText: { fontSize: 12, color: colors.text },
  chipTextActive: { fontWeight: "800" },

  sectionTitle: {
    color: colors.mutedText,
    marginBottom: 8,
    fontWeight: "800",
  },

  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(50,73,86,0.55)",
    marginBottom: 10,
  },
  habitCardDone: { backgroundColor: "rgba(50,73,86,0.35)" },
  habitDot: { width: 10, height: 10, borderRadius: 999 },
  habitText: { color: colors.text, fontWeight: "800" },
  habitTextDone: {
    textDecorationLine: "line-through",
    color: "rgba(241,233,215,0.7)",
  },

  blockPill: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(241,233,215,0.1)",
  },
  blockPillDone: { backgroundColor: "rgba(142,205,110,0.15)" },
  blockPillText: { fontSize: 12, color: colors.text },
  blockPillTextDone: { color: "rgba(241,233,215,0.7)" },

  swipeAction: {
    justifyContent: "center",
    paddingLeft: 24,
    marginVertical: 6,
    borderRadius: 18,
  },
  swipeActionText: { color: colors.bg, fontWeight: "900", fontSize: 16 },
});
