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

  // opcional: para permitir marcar un día (si lo quieres)
  onPressDay?: (date: string) => void;
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

function stateToStyle(state: MonthlyDayState) {
  // No uso colores hardcode si tienes theme.
  // Aquí van clases/estilos base, luego los conectas a tu theme.
  switch (state) {
    case "done":
      return { opacity: 1, borderWidth: 0 };
    case "missed":
      return { opacity: 1, borderWidth: 1 };
    case "future":
      return { opacity: 0.5, borderWidth: 0 };
    case "unscheduled":
      return { opacity: 0.25, borderWidth: 0 };
    default:
      return { opacity: 1, borderWidth: 0 };
  }
}

function isPressableState(state: MonthlyDayState) {
  // Regla: no permitir toggle en future/unscheduled
  return state === "done" || state === "missed";
}

export default function MonthlyCalendar({
  year,
  month,
  days,
  onPrevMonth,
  onNextMonth,
  onPressDay,
}: Props) {
  const today = useMemo(() => toLocalYMD(new Date()), []);

  // 1) offset para alinear el día 1 del mes con el weekday
  const gridItems = useMemo(() => {
    if (!days.length) return [];

    const firstDayWeekday = getWeekDayFromLocalDate(days[0].date); // 0..6
    const padding = Array.from({ length: firstDayWeekday }, () => null);

    // Lista con nulls al inicio para alinear el mes en el grid
    return [...padding, ...days];
  }, [days]);

  // 2) Título del mes
  const monthLabel = useMemo(() => {
    // Mes en español (simple). Si tienes i18n, cámbialo.
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

        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text }}>
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
            <Text style={{ color: colors.text }}>{w}</Text>
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
          const canPress = onPressDay && isPressableState(item.state);

          const base = stateToStyle(item.state);

          // Sugerencia: conecta esto a tu theme (colores reales)
          const bg =
            item.state === "done"
              ? "#2E7D32"
              : item.state === "missed"
              ? "transparent"
              : "transparent";

          const borderColor =
            item.state === "missed" ? "#D32F2F" : "transparent";
          const textColor = item.state === "done" ? colors.text : colors.text;

          return (
            <View style={{ flex: 1, aspectRatio: 1, padding: 6 }}>
              <Pressable
                disabled={!canPress}
                onPress={() => onPressDay?.(item.date)}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: bg,
                  borderColor,
                  ...base,
                  borderWidth: base.borderWidth,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isToday ? "800" : "600",
                    opacity: item.state === "done" ? 1 : 0.9,
                    color: item.state === "done" ? "white" : textColor,
                  }}
                >
                  {item.dayOfMonth}
                </Text>

                {/* Puntito para "done" (si no quieres fondo) */}
                {item.state === "done" ? (
                  <View
                    style={{
                      marginTop: 6,
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      backgroundColor: "white",
                      opacity: 0.9,
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
