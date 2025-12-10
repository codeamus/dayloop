// app/habit-new.tsx
import WeekdaySelector from "@/presentation/components/WeekdaySelector";
import { useCreateHabit } from "@/presentation/hooks/useCreateHabit";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const COLOR_OPTIONS = ["#22c55e", "#3b82f6", "#f97316", "#ec4899", "#a855f7"];
const EMOJI_OPTIONS = ["🔥", "🌱", "⭐️", "📚", "💧", "💪"];

type HabitType = "daily" | "weekly";

export default function HabitNewScreen() {
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const { create, isLoading } = useCreateHabit();

  const [name, setName] = useState("");
  const [type, setType] = useState<HabitType>("daily");
  const [color, setColor] = useState<string>(COLOR_OPTIONS[2]);
  const [emoji, setEmoji] = useState<string>("🔥");
  const [time, setTime] = useState<string>("08:00");

  const todayIndex = new Date().getDay(); // 0-6
  const [weeklyDays, setWeeklyDays] = useState<number[]>([todayIndex]);

  const snapPoints = useMemo(() => ["60%"], []);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) {
        router.back();
      }
    },
    [router]
  );

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleBackgroundPress = useCallback(() => {
    bottomSheetRef.current?.close();
    router.back();
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Escribe un nombre para el hábito.");
      return;
    }

    const result = await create({
      name: name.trim(),
      color,
      icon: emoji,
      type,
      time,
      weeklyDays: type === "weekly" ? weeklyDays : undefined,
    });

    if (!result.ok) {
      Alert.alert(
        "Error al crear",
        "No se pudo crear el hábito. Inténtalo de nuevo."
      );
      return;
    }

    router.back();
  }, [name, color, emoji, type, time, weeklyDays, create, router]);

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={handleBackgroundPress} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <BottomSheet
          ref={bottomSheetRef}
          index={0}
          snapPoints={snapPoints}
          enablePanDownToClose
          onChange={handleSheetChange}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.handleIndicator}
        >
          <BottomSheetView style={styles.content}>
            <Text style={styles.title}>Crear nuevo hábito</Text>

            {/* Nombre */}
            <View style={styles.field}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej: Tomar agua, Leer 10 minutos..."
                placeholderTextColor="#9ca3af"
                style={styles.input}
              />
            </View>

            {/* Tipo */}
            <View style={styles.field}>
              <Text style={styles.label}>Tipo</Text>
              <View style={styles.row}>
                <ToggleChip
                  label="Diario"
                  active={type === "daily"}
                  onPress={() => setType("daily")}
                />
                <ToggleChip
                  label="Semanal"
                  active={type === "weekly"}
                  onPress={() => setType("weekly")}
                />
              </View>
            </View>

            {/* Días de la semana (solo para semanal) */}
            {type === "weekly" && (
              <View style={styles.field}>
                <Text style={styles.label}>Días de la semana</Text>
                <WeekdaySelector
                  selectedDays={weeklyDays}
                  onChange={setWeeklyDays}
                />
              </View>
            )}

            {/* Hora */}
            <View style={styles.field}>
              <Text style={styles.label}>Hora del día</Text>
              <Pressable
                style={styles.timeButton}
                onPress={() => {
                  Alert.alert(
                    "Selector de hora pendiente",
                    "Aquí puedes integrar un time picker nativo más adelante."
                  );
                }}
              >
                <Text style={styles.timeButtonText}>{time}</Text>
              </Pressable>
            </View>

            {/* Color */}
            <View style={styles.field}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.row}>
                {COLOR_OPTIONS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      color === c && styles.colorDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Emoji */}
            <View style={styles.field}>
              <Text style={styles.label}>Emoji</Text>
              <View style={styles.row}>
                {EMOJI_OPTIONS.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => setEmoji(e)}
                    style={[
                      styles.emojiChip,
                      emoji === e && styles.emojiChipActive,
                    ]}
                  >
                    <Text style={styles.emoji}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Botones */}
            <View className="footerRow" style={styles.footerRow}>
              <Pressable
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, isLoading && { opacity: 0.5 }]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text style={styles.primaryText}>
                  {isLoading ? "Creando..." : "Crear hábito"}
                </Text>
              </Pressable>
            </View>
          </BottomSheetView>
        </BottomSheet>
      </KeyboardAvoidingView>
    </View>
  );
}

type ToggleChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function ToggleChip({ label, active, onPress }: ToggleChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, backgroundColor: "transparent" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheetBackground: {
    backgroundColor: "#020617",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    backgroundColor: "#4b5563",
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#f9fafb",
    marginBottom: 4,
  },
  field: { gap: 8 },
  label: { fontSize: 14, color: "#9ca3af" },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f9fafb",
    fontSize: 14,
    backgroundColor: "#020617",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4b5563",
  },
  chipActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  chipText: { fontSize: 13, color: "#e5e7eb" },
  chipTextActive: { color: "#020617", fontWeight: "600" },
  timeButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#374151",
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  timeButtonText: { fontSize: 14, color: "#f9fafb" },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotActive: { borderColor: "#ffffff" },
  emojiChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4b5563",
  },
  emojiChipActive: {
    backgroundColor: "#1f2937",
    borderColor: "#f97316",
  },
  emoji: { fontSize: 20 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4b5563",
  },
  cancelText: { color: "#e5e7eb", fontSize: 14 },
  primaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#22c55e",
  },
  primaryText: { color: "#020617", fontSize: 14, fontWeight: "600" },
});
