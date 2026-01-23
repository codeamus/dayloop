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
  weekStart?: string; // Para agrupar por semanas
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
  // Convertir history a formato SectionList, manteniendo información de semanas
  const sections: HistorySection[] =
    history?.months.map((month) => {
      const items: HistoryItem[] = [];
      
      month.weeks.forEach((week, weekIndex) => {
        week.days.forEach((day, dayIndex) => {
          items.push({
            type: "day" as const,
            date: day.date,
            label: day.label,
            totalPlanned: day.totalPlanned,
            totalDone: day.totalDone,
            completionRate: day.completionRate,
            weekStart: week.weekStart, // Mantener info de semana para separadores
          });
        });
      });
      
      return {
        title: month.monthLabel,
        monthGroup: month,
        data: items,
      };
    }) || [];

  const renderItem = ({ item, index, section }: { item: HistoryItem; index: number; section: HistorySection }) => {
    const pct = item.totalPlanned <= 0 ? 0 : toPct(item.completionRate);
    const isRestDay = item.totalPlanned <= 0;
    
    // Detectar si es el primer día de una nueva semana (para separador)
    const prevItem = index > 0 ? section.data[index - 1] : null;
    const isNewWeek = prevItem && prevItem.weekStart !== item.weekStart;

    return (
      <View>
        {/* Separador sutil entre semanas */}
        {isNewWeek && (
          <View style={styles.weekSeparator} />
        )}
        
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
            {isRestDay ? (
              <Text style={styles.dayRestLabel}>Descanso</Text>
            ) : (
              <Text style={styles.dayInfo}>
                {item.totalDone}/{item.totalPlanned} ({pct}%)
              </Text>
            )}
          </View>

          {/* Barra de progreso */}
          {isRestDay ? (
            <View style={styles.restDayBar}>
              <View style={[styles.restDayBarFill, { width: "100%" }]} />
            </View>
          ) : (
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
          )}
        </Pressable>
      </View>
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
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerText}>Cargando más...</Text>
        </View>
      );
    }

    // Empty state al final cuando no hay más datos
    if (sections.length > 0 && !loading) {
      return (
        <View style={styles.endMessage}>
          <Text style={styles.endMessageText}>Aquí empieza tu camino</Text>
        </View>
      );
    }

    return null;
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
        // Optimizaciones de rendimiento
        initialNumToRender={10}
        windowSize={5}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={true}
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
  weekSeparator: {
    height: 1,
    backgroundColor: "rgba(241,233,215,0.08)",
    marginVertical: 8,
    marginHorizontal: 16,
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
  endMessage: {
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  endMessageText: {
    color: "rgba(241,233,215,0.50)",
    fontSize: 13,
    fontWeight: "800",
    fontStyle: "italic",
    letterSpacing: 0.3,
  },
});
