// src/presentation/components/WeekdaySelector.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  selectedDays: number[]; // 0–6, como Date.getDay()
  onChange: (days: number[]) => void;
};

const WEEK_DAYS: { label: string; full: string; value: number }[] = [
  { label: "L", full: "Lunes", value: 1 },
  { label: "M", full: "Martes", value: 2 },
  { label: "X", full: "Miércoles", value: 3 },
  { label: "J", full: "Jueves", value: 4 },
  { label: "V", full: "Viernes", value: 5 },
  { label: "S", full: "Sábado", value: 6 },
  { label: "D", full: "Domingo", value: 0 },
];

export default function WeekdaySelector({ selectedDays, onChange }: Props) {
  const handleToggle = (day: number) => {
    const exists = selectedDays.includes(day);
    const next = exists
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day].sort();

    onChange(next);
  };

  return (
    <View style={styles.container}>
      {WEEK_DAYS.map((day) => {
        const active = selectedDays.includes(day.value);
        return (
          <Pressable
            key={day.value}
            onPress={() => handleToggle(day.value)}
            style={[styles.day, active && styles.dayActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {day.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  day: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4b5563",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  dayActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  label: {
    fontSize: 13,
    color: "#e5e7eb",
  },
  labelActive: {
    color: "#020617",
    fontWeight: "600",
  },
});
