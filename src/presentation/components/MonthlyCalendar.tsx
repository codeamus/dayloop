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

// ✅ Lunes -> Domingo
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

// "YYYY-MM-DD" -> weekday 0..6 (local) (Dom=0)
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

// Convierte weekday nativo (Dom=0..Sab=6) a weekday "lunes primero" (Lun=0..Dom=6)
function toMondayFirstIndex(nativeWeekday: number): number {
  return (nativeWeekday + 6) % 7; // Dom(0)->6, Lun(1)->0, ...
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

  /**
   * Grid:
   * - Rellenamos con nulls al inicio según el weekday del día 1 del mes.
   * - ✅ Importante: Lunes primero (no domingo).
   */
  const gridItems = useMemo(() => {
    if (!days.length) return [];

    const firstNativeWd = getWeekDayFromLocalDate(days[0].date); // Dom=0..Sab=6
    const firstWdMondayFirst = toMondayFirstIndex(firstNativeWd); // Lun=0..Dom=6

    const padding = Array.from({ length: firstWdMondayFirst }, () => null);
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

  /**
   * ✅ FIX del “último día gigante”
   * Con FlatList numColumns=7, si tu celda usa `flex: 1`,
   * la última fila (con menos ítems) estira esos ítems.
   *
   * Solución: dar ancho fijo por columna usando porcentaje,
   * y NO usar flex: 1 en el wrapper.
   */
  const cellWrapperStyle = { width: `${100 / 7}%`, padding: 6 } as const;

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

      {/* Weekday labels (L -> D) */}
      <View style={{ flexDirection: "row" }}>
        {WEEKDAYS.map((w, index) => (
          <View
            key={`weekday-${index}-${w}`}
            style={{
              width: `${100 / 7}%`,
              alignItems: "center",
              paddingVertical: 6,
            }}
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
            return <View style={cellWrapperStyle} />;
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
              : "transparent";

          const borderWidth = 1;

          const allowToggle = !!onPressDay && isToggleAllowed(item.state);

          return (
            <View style={cellWrapperStyle}>
              <Pressable
                onPress={() => {
                  if (allowToggle) {
                    onPressDay?.(item.date);
                    return;
                  }
                  onBlockedPress?.({ date: item.date, state: item.state });
                }}
                style={{
                  width: "100%",
                  aspectRatio: 1, // ✅ cuadrado pero sin “flex: 1” (no se estira en última fila)
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: bg,
                  borderColor,
                  borderWidth,
                  ...base,
                  ...(isUnscheduled(item.state) && { borderStyle: "dashed" }),
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
