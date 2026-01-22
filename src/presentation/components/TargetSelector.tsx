// src/presentation/components/TargetSelector.tsx
import { colors } from "@/theme/colors";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type TargetSelectorProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

export function TargetSelector({
  value,
  onChange,
  min = 1,
  max = 20,
}: TargetSelectorProps) {
  const handleDecrement = () => {
    const newValue = Math.max(min, value - 1);
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + 1);
    onChange(newValue);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Objetivo diario</Text>
      <View style={styles.selectorRow}>
        <Pressable
          onPress={handleDecrement}
          style={[styles.button, value <= min && styles.buttonDisabled]}
          disabled={value <= min}
          hitSlop={10}
        >
          <Feather
            name="minus"
            size={20}
            color={value <= min ? colors.mutedText : colors.text}
          />
        </Pressable>

        <View style={styles.valueContainer}>
          <Text style={styles.valueText}>{value}</Text>
          <Text style={styles.valueLabel}>
            {value === 1 ? "vez" : "veces"}
          </Text>
        </View>

        <Pressable
          onPress={handleIncrement}
          style={[styles.button, value >= max && styles.buttonDisabled]}
          disabled={value >= max}
          hitSlop={10}
        >
          <Feather
            name="plus"
            size={20}
            color={value >= max ? colors.mutedText : colors.text}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    color: colors.mutedText,
    fontWeight: "900",
  },
  selectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(43,62,74,0.25)",
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.18)",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  valueContainer: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },
  valueText: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.text,
    lineHeight: 38,
  },
  valueLabel: {
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: "800",
    marginTop: 2,
  },
});
