import { colors as theme } from "@/theme/colors";
import React, { useMemo } from "react";
import {
     Modal,
     Platform,
     Pressable,
     StyleSheet,
     Text,
     View,
} from "react-native";

type Props = {
  visible: boolean;
  value: string;
  onSelect: (hex: string) => void;
  onClose: () => void;
  title?: string;
  palette?: string[];
};

const DEFAULT_PALETTE = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#D946EF",
  "#EC4899",
  "#F43F5E",
  "#FB7185",
  "#FDBA74",
  "#FDE047",
  "#A3E635",
  "#86EFAC",
  "#5EEAD4",
  "#67E8F9",
  "#93C5FD",
  "#A5B4FC",
  "#C4B5FD",
  "#E9D5FF",
  "#FBCFE8",
  "#CBD5E1",
  "#94A3B8",
  "#64748B",
  "#475569",
  "#334155",
  "#1F2937",
  "#111827",
];

export function ColorPickerSheet({
  visible,
  value,
  onSelect,
  onClose,
  title = "Elegir color",
  palette,
}: Props) {
  const colors = useMemo(() => palette ?? DEFAULT_PALETTE, [palette]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>

            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.previewRow}>
            <View style={[styles.previewDot, { backgroundColor: value }]} />
            <Text style={styles.previewText}>{value}</Text>
          </View>

          <View style={styles.grid}>
            {colors.map((c) => {
              const active = c.toLowerCase() === value.toLowerCase();
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    onSelect(c);
                    onClose();
                  }}
                  style={[
                    styles.dot,
                    { backgroundColor: c },
                    active && styles.dotActive,
                  ]}
                  hitSlop={8}
                />
              );
            })}
          </View>

          <Pressable style={styles.footerBtn} onPress={onClose}>
            <Text style={styles.footerText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 22,
    padding: 16,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.25,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 10 },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    color: theme.text,
    fontSize: 16,
    fontWeight: "900",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43,62,74,0.25)",
    borderWidth: 1,
    borderColor: theme.border,
  },
  closeText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: "900",
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  previewDot: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
  },
  previewText: {
    color: theme.mutedText,
    fontSize: 12,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  dotActive: {
    borderWidth: 3,
    borderColor: theme.text,
  },
  footerBtn: {
    marginTop: 14,
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.18)",
  },
  footerText: {
    color: theme.text,
    fontSize: 13,
    fontWeight: "900",
  },
});
