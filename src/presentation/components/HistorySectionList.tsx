// src/presentation/components/HistorySectionList.tsx
import { colors } from "@/theme/colors";
import type { FullHistory, MonthGroup, WeekSummary } from "@/domain/usecases/GetFullHistory";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

type HistoryItem = {
  type: "day";
  date: string;
  label: string;
  totalPlanned: number;
  totalDone: number;
  completionRate: number;
};

type HistorySection = {
  title: string;
  data: HistoryItem[];
  monthGroup: MonthGroup;
};

function clamp(n: number, min = 0, max = 100) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function toPct(rate: number) {
  if (!Number.isFinite(rate)) return 0;
  return clamp(Math.round(rate * 100), 0, 100);
}

function formatShortDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
  }).format(dt);
}

type Props = {
  history: FullHistory | null;
  loading: boolean;
  loadingMore: boolean;
  onEndReached?: () => void;
  onDayPress?: (date: string) => void;
};

export function HistorySectionList({
  history,
  loading,
  loadingMore,
  onEndReached,
  onDayPress,
}: Props) {
  // Convertir history a formato SectionList
  const sections: HistorySection[] =
    history?.months.map((month) => ({
      title: month.monthLabel,
      monthGroup: month,
      data: month.weeks.flatMap((week) =>
        week.days.map((day) => ({
          type: "day" as const,
          date: day.date,
          label: day.label,
          totalPlanned: day.totalPlanned,
          totalDone: day.totalDone,
          completionRate: day.completionRate,
        }))
      ),
    })) || [];

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const pct = item.totalPlanned <= 0 ? 0 : toPct(item.completionRate);

    return (
      <Pressable
        style={styles.dayRow}
        onPress={() => onDayPress?.(item.date)}
        disabled={!onDayPress}
      >
        <View style={styles.dayHeader}>
          <View style={styles.dayLeft}>
            <Text style={styles.dayLabel}>{item.label}</Text>
            <Text style={styles.dayDate}>{formatShortDate(item.date)}</Text>
          </View>
          <Text style={styles.dayInfo}>
            {item.totalDone}/{item.totalPlanned} ({pct}%)
          </Text>
        </View>

        {/* Barra de progreso */}
        <View style={styles.barBackground}>
          <View
            style={[
              styles.barFill,
              {
                width: `${pct}%`,
                backgroundColor: colors.success,
              },
            ]}
          />
        </View>

        {item.totalPlanned <= 0 && (
          <Text style={styles.dayMuted}>Sin hábitos planificados</Text>
        )}
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: HistorySection }) => {
    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>Cargando más...</Text>
      </View>
    );
  };


  if (loading && sections.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          Aún no hay datos suficientes para mostrar el historial.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item, index) => `${item.date}-${index}`}
        stickySectionHeadersEnabled={true}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 28,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 40,
  },
  loadingText: {
    color: colors.mutedText,
    fontSize: 13,
  },
  emptyText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  sectionHeader: {
    backgroundColor: "rgba(50,73,86,0.60)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  dayRow: {
    marginHorizontal: 16,
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
  dayLeft: {
    flex: 1,
  },
  dayLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  dayDate: {
    color: colors.mutedText,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "700",
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
    height: "100%",
    borderRadius: 999,
  },
  dayMuted: {
    marginTop: 8,
    color: colors.mutedText,
    fontSize: 11,
    fontWeight: "800",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  footerText: {
    color: colors.mutedText,
    fontSize: 12,
    fontWeight: "800",
  },
});
