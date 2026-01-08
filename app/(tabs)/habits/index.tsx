// app/(tabs)/habits/index.tsx
import type { HabitSchedule } from "@/domain/entities/Habit";
import { Screen } from "@/presentation/components/Screen";
import { useAllHabits } from "@/presentation/hooks/useAllHabits";
import { colors } from "@/theme/colors";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";

type Filter = "all" | "daily" | "weekly" | "monthly";

function scheduleType(schedule: HabitSchedule | any): Filter {
  const t = schedule?.type;
  if (t === "weekly" || t === "monthly") return t;
  return "daily";
}

function typeLabel(t: Filter) {
  if (t === "weekly") return "Semanal";
  if (t === "monthly") return "Mensual";
  return "Diario";
}

function scheduleDetail(schedule: HabitSchedule | any): string | null {
  if (!schedule || typeof schedule !== "object") return null;

  if (schedule.type === "weekly") {
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
    if (!sorted.length) return null;
    return sorted.map((d) => map[d] ?? "?").join(" · ");
  }

  if (schedule.type === "monthly") {
    const days = Array.isArray(schedule.daysOfMonth)
      ? schedule.daysOfMonth
      : [];
    const sorted = [...days].sort((a, b) => a - b);
    if (!sorted.length) return null;
    return `Días ${sorted.join(", ")}`;
  }

  return null;
}

function formatTime(h: any): string | null {
  const start = h?.startTime ?? h?.time ?? null;
  const end = h?.endTime ?? null;
  if (!start && !end) return null;
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  return null;
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
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

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCount}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
    </View>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: "primary" | "soft" | "paused";
}) {
  return (
    <View
      style={[
        styles.pill,
        tone === "primary"
          ? styles.pillPrimary
          : tone === "paused"
          ? styles.pillPaused
          : styles.pillSoft,
      ]}
    >
      <Text
        style={[
          styles.pillText,
          tone === "primary"
            ? styles.pillTextPrimary
            : tone === "paused"
            ? styles.pillTextPaused
            : styles.pillTextSoft,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function RightActions({
  paused,
  height,
  onTogglePause,
  onDelete,
}: {
  paused: boolean;
  height: number;
  onTogglePause: () => void;
  onDelete: () => void;
}) {
  const h = Math.max(76, height || 0);

  return (
    <View style={[styles.actionsPanel, { height: h }]}>
      <Pressable
        onPress={onTogglePause}
        style={[
          styles.actionRow,
          paused ? styles.actionResume : styles.actionPause,
        ]}
      >
        <Text style={[styles.actionText, paused && styles.actionTextResume]}>
          {paused ? "Reanudar" : "Pausar"}
        </Text>
      </Pressable>

      <View style={styles.actionDivider} />

      <Pressable
        onPress={onDelete}
        style={[styles.actionRow, styles.actionDel]}
      >
        <Text style={styles.actionText}>Eliminar</Text>
      </Pressable>
    </View>
  );
}

export default function HabitsListScreen() {
  const { habits, loading, remove, setPaused } = useAllHabits();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

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

  function confirmTogglePause(h: any) {
    const paused = !!h?.isPaused;
    Alert.alert(
      paused ? "Reanudar hábito" : "Pausar hábito",
      paused
        ? `¿Reanudar "${h.name}"? Volverás a recibir recordatorios.`
        : `¿Pausar "${h.name}"? No recibirás recordatorios hasta reanudarlo.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: paused ? "Reanudar" : "Pausar",
          onPress: () => setPaused(h.id, !paused),
        },
      ]
    );
  }

  const stats = useMemo(() => {
    const daily = habits.filter(
      (h) => scheduleType(h.schedule) === "daily"
    ).length;
    const weekly = habits.filter(
      (h) => scheduleType(h.schedule) === "weekly"
    ).length;
    const monthly = habits.filter(
      (h) => scheduleType(h.schedule) === "monthly"
    ).length;
    return { total: habits.length, daily, weekly, monthly };
  }, [habits]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return habits
      .filter((h) =>
        filter === "all" ? true : scheduleType(h.schedule) === filter
      )
      .filter((h) => (!q ? true : (h.name ?? "").toLowerCase().includes(q)));
  }, [habits, query, filter]);

  const sections = useMemo(() => {
    const daily = filtered.filter((h) => scheduleType(h.schedule) === "daily");
    const weekly = filtered.filter(
      (h) => scheduleType(h.schedule) === "weekly"
    );
    const monthly = filtered.filter(
      (h) => scheduleType(h.schedule) === "monthly"
    );
    return { daily, weekly, monthly };
  }, [filtered]);

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
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={styles.headerBtn}
          hitSlop={10}
        >
          <Text style={styles.headerBtnText}>‹ Volver</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Hábitos</Text>

        <Pressable
          onPress={() => router.push("/habit-new")}
          style={[styles.headerBtn, styles.headerBtnPrimary]}
          hitSlop={10}
        >
          <Text style={[styles.headerBtnText, styles.headerBtnTextPrimary]}>
            + Crear
          </Text>
        </Pressable>
      </View>

      <View style={styles.headerCenterBlock}>
        <Text style={styles.headerSubtitle}>
          {stats.total} total · {stats.daily} diarios · {stats.weekly} semanales
          · {stats.monthly} mensuales
        </Text>
      </View>

      <View style={styles.searchBox}>
        <Feather name="search" size={16} color={"rgba(241,233,215,0.55)"} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar hábito…"
          placeholderTextColor="rgba(241,233,215,0.35)"
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {!!query && (
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={10}
            style={styles.clearBtn}
          >
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.chipsRow}>
        <Chip
          label="Todos"
          active={filter === "all"}
          onPress={() => setFilter("all")}
        />
        <Chip
          label={`Diario (${stats.daily})`}
          active={filter === "daily"}
          onPress={() => setFilter("daily")}
        />
        <Chip
          label={`Semanal (${stats.weekly})`}
          active={filter === "weekly"}
          onPress={() => setFilter("weekly")}
        />
        <Chip
          label={`Mensual (${stats.monthly})`}
          active={filter === "monthly"}
          onPress={() => setFilter("monthly")}
        />
      </View>

      {habits.length === 0 ? (
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
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No encontramos resultados</Text>
          <Text style={styles.emptySubtitle}>
            Prueba con otro nombre o cambia el filtro.
          </Text>
          <Pressable
            style={[
              styles.emptyCta,
              { backgroundColor: "rgba(230,188,1,0.18)" },
            ]}
            onPress={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            <Text style={[styles.emptyCtaText, { color: colors.text }]}>
              Limpiar filtros
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {sections.daily.length > 0 && (
            <>
              <SectionHeader title="Diarios" count={sections.daily.length} />
              {sections.daily.map((h) => (
                <HabitCard
                  key={h.id}
                  h={h}
                  onPress={() => router.push(`/(tabs)/habits/${h.id}`)}
                  onDelete={() => confirmDelete(h.id, h.name)}
                  onTogglePause={() => confirmTogglePause(h)}
                />
              ))}
            </>
          )}

          {sections.weekly.length > 0 && (
            <>
              <SectionHeader title="Semanales" count={sections.weekly.length} />
              {sections.weekly.map((h) => (
                <HabitCard
                  key={h.id}
                  h={h}
                  onPress={() => router.push(`/(tabs)/habits/${h.id}`)}
                  onDelete={() => confirmDelete(h.id, h.name)}
                  onTogglePause={() => confirmTogglePause(h)}
                />
              ))}
            </>
          )}

          {sections.monthly.length > 0 && (
            <>
              <SectionHeader
                title="Mensuales"
                count={sections.monthly.length}
              />
              {sections.monthly.map((h) => (
                <HabitCard
                  key={h.id}
                  h={h}
                  onPress={() => router.push(`/(tabs)/habits/${h.id}`)}
                  onDelete={() => confirmDelete(h.id, h.name)}
                  onTogglePause={() => confirmTogglePause(h)}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

function HabitCard({
  h,
  onPress,
  onDelete,
  onTogglePause,
}: {
  h: any;
  onPress: () => void;
  onDelete: () => void;
  onTogglePause: () => void;
}) {
  const t = scheduleType(h.schedule);
  const label = typeLabel(t);
  const time = formatTime(h);
  const detail = scheduleDetail(h.schedule);
  const paused = !!h?.isPaused;

  const [height, setHeight] = useState(0);

  return (
    <View style={styles.itemWrap}>
      <Swipeable
        overshootRight={false}
        renderRightActions={() => (
          <RightActions
            paused={paused}
            height={height}
            onTogglePause={onTogglePause}
            onDelete={onDelete}
          />
        )}
      >
        <Pressable
          onLayout={(e) => {
            const next = Math.round(e.nativeEvent.layout.height);
            if (next > 0 && next !== height) setHeight(next);
          }}
          style={[styles.card, paused && styles.cardPaused]}
          onPress={onPress}
        >
          <View
            style={[
              styles.cardBar,
              {
                backgroundColor: h.color || colors.primary,
                opacity: paused ? 0.5 : 0.95,
              },
            ]}
          />

          <View style={styles.cardMain}>
            <Text
              style={[styles.cardTitle, paused && styles.cardTitlePaused]}
              numberOfLines={1}
            >
              {h.name}
            </Text>

            <View style={styles.cardMeta}>
              <Pill label={label} tone="primary" />
              {!!time && <Pill label={time} tone="soft" />}
              {paused && <Pill label="Pausado" tone="paused" />}
              {!!detail && (
                <Text
                  style={[styles.cardDetail, paused && styles.cardDetailPaused]}
                  numberOfLines={1}
                >
                  {detail}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.cardRight}>
            <View
              style={[styles.iconBubble, paused && styles.iconBubblePaused]}
            >
              <Text style={[styles.cardIcon, paused && styles.cardIconPaused]}>
                {h.icon}
              </Text>
            </View>
            <Text style={styles.cardChev}>›</Text>
          </View>
        </Pressable>
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: colors.mutedText, fontSize: 13 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(50,73,86,0.40)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerBtnPrimary: {
    backgroundColor: "rgba(230,188,1,0.16)",
    borderColor: "rgba(230,188,1,0.45)",
  },
  headerBtnText: { color: colors.text, fontWeight: "900", fontSize: 13 },
  headerBtnTextPrimary: { color: colors.primary },

  headerCenterBlock: { alignItems: "center", marginBottom: 12 },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: "900" },
  headerSubtitle: {
    marginTop: 6,
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 15,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(50,73,86,0.40)",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
    paddingVertical: 0,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.15)",
  },
  clearText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: -1,
  },

  chipsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 14,
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
  chipText: { fontSize: 12, color: colors.text, fontWeight: "700" },
  chipTextActive: { fontWeight: "900" },

  sectionHeader: {
    marginTop: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  sectionCount: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(241,233,215,0.08)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.14)",
  },
  sectionCountText: { color: colors.text, fontSize: 12, fontWeight: "900" },

  emptyBox: {
    marginTop: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(50,73,86,0.55)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
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
  emptyCtaText: { color: colors.primaryText, fontSize: 14, fontWeight: "900" },

  itemWrap: { marginTop: 10 },

  card: {
    borderRadius: 18,
    backgroundColor: "rgba(50,73,86,0.45)",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    minHeight: 76,
  },
  cardPaused: { backgroundColor: "rgba(50,73,86,0.30)" },

  cardBar: { width: 4, alignSelf: "stretch", borderRadius: 999 },
  cardMain: { flex: 1, paddingRight: 6 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: "900" },
  cardTitlePaused: { opacity: 0.75 },

  cardMeta: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  cardDetail: {
    color: "rgba(241,233,215,0.60)",
    fontSize: 12,
    fontWeight: "800",
  },
  cardDetailPaused: { opacity: 0.7 },

  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  pillPrimary: {
    backgroundColor: "rgba(230,188,1,0.14)",
    borderColor: "rgba(230,188,1,0.30)",
  },
  pillSoft: {
    backgroundColor: "rgba(241,233,215,0.10)",
    borderColor: "rgba(241,233,215,0.18)",
  },
  pillPaused: {
    backgroundColor: "rgba(241,233,215,0.06)",
    borderColor: "rgba(241,233,215,0.14)",
  },

  pillText: { fontSize: 12, fontWeight: "900" },
  pillTextPrimary: { color: colors.primary },
  pillTextSoft: { color: colors.text },
  pillTextPaused: { color: "rgba(241,233,215,0.85)" },

  cardRight: {
    flexDirection: "row",
    width: 56,
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.16)",
  },
  iconBubblePaused: { opacity: 0.65 },
  cardIcon: { fontSize: 18 },
  cardIconPaused: { opacity: 0.65 },
  cardChev: {
    color: "rgba(241,233,215,0.55)",
    fontSize: 32,
    fontWeight: "900",
  },

  actionsPanel: {
    width: 130,
    marginLeft: 10,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(50,73,86,0.45)",
  },
  actionRow: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  actionDivider: {
    height: 1,
    backgroundColor: "rgba(241,233,215,0.12)",
  },
  actionPause: { backgroundColor: "rgba(241,233,215,0.08)" },
  actionResume: { backgroundColor: "rgba(230,188,1,0.14)" },
  actionDel: { backgroundColor: "rgba(255,90,90,0.18)" },
  actionText: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 13,
  },
  actionTextResume: { color: colors.primary },
});
