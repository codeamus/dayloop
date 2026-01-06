// src/presentation/components/MonthlyCalendar.tsx
import type {
  MonthlyDay,
  MonthlyDayState,
} from "@/domain/usecases/GetHabitMonthlyStats";
import { colors } from "@/theme/colors";
import React, { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

type Props = {
  year: number;
  month: number; // 1..12
  days: MonthlyDay[];
  onPrevMonth: () => void;
  onNextMonth: () => void;

  // ✅ toggle real (solo done/missed)
  onPressDay?: (date: string) => void;

  // ✅ feedback cuando está bloqueado (future/unscheduled)
  onBlockedPress?: (info: { date: string; state: MonthlyDayState }) => void;
};

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];

// "YYYY-MM-DD" -> weekday 0..6 (local)
function getWeekDayFromLocalDate(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y || 2000, (m || 1) - 1, d || 1);
  return dt.getDay();
}

function toLocalYMD(d: Date): string {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function stateToCellStyle(state: MonthlyDayState) {
  switch (state) {
    case "done":
      return { opacity: 1 };
    case "missed":
      return { opacity: 1 };
    case "future":
      return { opacity: 0.55 };
    case "unscheduled":
      return { opacity: 0.22 };
    default:
      return { opacity: 1 };
  }
}

function isToggleAllowed(state: MonthlyDayState) {
  return state === "done" || state === "missed";
}

function isUnscheduled(state: MonthlyDayState) {
  return state === "unscheduled";
}

export default function MonthlyCalendar({
  year,
  month,
  days,
  onPrevMonth,
  onNextMonth,
  onPressDay,
  onBlockedPress,
}: Props) {
  const today = useMemo(() => toLocalYMD(new Date()), []);

  const gridItems = useMemo(() => {
    if (!days.length) return [];
    const firstDayWeekday = getWeekDayFromLocalDate(days[0].date); // 0..6
    const padding = Array.from({ length: firstDayWeekday }, () => null);
    return [...padding, ...days];
  }, [days]);

  const monthLabel = useMemo(() => {
    const months = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    return `${months[month - 1]} ${year}`;
  }, [year, month]);

  return (
    <View style={{ gap: 12 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={onPrevMonth}
          style={{ paddingHorizontal: 12, paddingVertical: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
        >
          <Text style={{ fontSize: 24, color: colors.text }}>{"‹"}</Text>
        </Pressable>

        <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>
          {monthLabel}
        </Text>

        <Pressable
          onPress={onNextMonth}
          style={{ paddingHorizontal: 12, paddingVertical: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
        >
          <Text style={{ fontSize: 24, color: colors.text }}>{"›"}</Text>
        </Pressable>
      </View>

      {/* Weekday labels */}
      <View style={{ flexDirection: "row" }}>
        {WEEKDAYS.map((w, index) => (
          <View
            key={`weekday-${index}-${w}`}
            style={{ flex: 1, alignItems: "center", paddingVertical: 6 }}
          >
            <Text style={{ color: colors.text, fontWeight: "900" }}>{w}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <FlatList
        data={gridItems}
        numColumns={7}
        keyExtractor={(item, idx) => (item ? item.date : `pad-${idx}`)}
        scrollEnabled={false}
        renderItem={({ item }) => {
          // PADDING CELL
          if (!item) {
            return <View style={{ flex: 1, aspectRatio: 1, padding: 6 }} />;
          }

          const isToday = item.date === today;
          const base = stateToCellStyle(item.state);

          const bg =
            item.state === "done"
              ? colors.success
              : isUnscheduled(item.state)
              ? "rgba(241,233,215,0.04)"
              : "transparent";

          const borderColor =
            item.state === "missed"
              ? colors.danger
              : isUnscheduled(item.state)
              ? colors.border
              : colors.border; // ✅ borde sutil para mantener el grid

          const borderWidth = item.state === "done" ? 0 : 1; // ✅ 1 para missed/unscheduled/future/normal

          const allowToggle = !!onPressDay && isToggleAllowed(item.state);

          return (
            <View style={{ flex: 1, aspectRatio: 1, padding: 6 }}>
              <Pressable
                // ✅ IMPORTANTE: NO usar disabled aquí, porque si no, no hay toast.
                onPress={() => {
                  if (allowToggle) {
                    onPressDay?.(item.date);
                    return;
                  }
                  onBlockedPress?.({ date: item.date, state: item.state });
                }}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: bg,
                  borderColor,
                  borderWidth,
                  ...(isUnscheduled(item.state) && {
                    borderStyle: "dashed",
                  }),
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isToday ? "900" : "800",
                    color:
                      item.state === "done"
                        ? colors.primaryText
                        : isUnscheduled(item.state)
                        ? colors.mutedText
                        : colors.text,
                  }}
                >
                  {item.dayOfMonth}
                </Text>

                {/* dot opcional para done */}
                {item.state === "done" ? (
                  <View
                    style={{
                      marginTop: 6,
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: colors.bg,
                      opacity: 0.8,
                    }}
                  />
                ) : null}
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}
