// app/habit-new.tsx
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
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

import WeekdaySelector from "@/presentation/components/WeekdaySelector";
import { useCreateHabit } from "@/presentation/hooks/useCreateHabit";

import { scheduleHabitReminder } from "@/core/notifications/notifications";

const COLOR_OPTIONS = ["#22c55e", "#3b82f6", "#f97316", "#ec4899", "#a855f7"];
const EMOJI_OPTIONS = ["🔥", "🌱", "⭐️", "📚", "💧", "💪"];

type HabitType = "daily" | "weekly";

export default function HabitNewScreen() {
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const { create, isLoading } = useCreateHabit();

  const REMINDER_OPTIONS = [
    { label: "Sin recordatorio", value: null as null | number },
    { label: "A la hora", value: 0 },
    { label: "5 min antes", value: 5 },
    { label: "10 min antes", value: 10 },
    { label: "30 min antes", value: 30 },
    { label: "1 hora antes", value: 60 },
  ];

  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<
    number | null
  >(0);

  const [name, setName] = useState("");
  const [type, setType] = useState<HabitType>("daily");
  const [color, setColor] = useState<string>(COLOR_OPTIONS[2]);
  const [emoji, setEmoji] = useState<string>("🔥");
  const [time, setTime] = useState<string>("08:00");

  const [timeDate, setTimeDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });

  const [showTimePicker, setShowTimePicker] = useState(false);

  const todayIndex = new Date().getDay(); // 0-6
  const [weeklyDays, setWeeklyDays] = useState<number[]>([todayIndex]);

  const snapPoints = useMemo(() => ["75%"], []);

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index === -1) router.back();
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

  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === "dismissed") {
        if (Platform.OS === "android") setShowTimePicker(false);
        return;
      }

      const currentDate = selectedDate ?? timeDate;

      const hours = currentDate.getHours();
      const minutes = currentDate.getMinutes();

      const hh = String(hours).padStart(2, "0");
      const mm = String(minutes).padStart(2, "0");

      setTime(`${hh}:${mm}`);
      setTimeDate(currentDate);

      if (Platform.OS === "android") setShowTimePicker(false);
    },
    [timeDate]
  );

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Escribe un nombre para el hábito.");
      return;
    }

    const payload = {
      name: name.trim(),
      color,
      icon: emoji,
      type,
      time,
      weeklyDays: type === "weekly" ? weeklyDays : undefined,
      reminderOffsetMinutes,
    };

    const result = await create(payload);

    if (!result.ok) {
      Alert.alert(
        "Error al crear",
        "No se pudo crear el hábito. Inténtalo de nuevo."
      );
      return;
    }

    // Programar recordatorio real del hábito (si NO es "Sin recordatorio")
    // Ajusta cómo obtienes el habitId según el retorno real de tu hook
    const habitId: string | null =
      (result as any)?.habit?.id ?? (result as any)?.id ?? null;

    if (habitId && reminderOffsetMinutes !== null) {
      const [hh, mm] = time.split(":").map((x) => Number(x));

      if (Number.isFinite(hh) && Number.isFinite(mm)) {
        await scheduleHabitReminder({
          habitId: habitId as any,
          habitName: name.trim(),
          hour: hh,
          minute: mm,
          offsetMinutes: reminderOffsetMinutes ?? 0,
        });
      }
    }

    router.back();
  }, [
    name,
    color,
    emoji,
    type,
    time,
    weeklyDays,
    reminderOffsetMinutes,
    create,
    router,
  ]);

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
                onPress={() => setShowTimePicker((prev) => !prev)}
              >
                <Text style={styles.timeButtonText}>{time}</Text>
              </Pressable>

              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={timeDate}
                    mode="time"
                    is24Hour
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleTimeChange}
                    themeVariant="dark"
                  />

                  {Platform.OS === "ios" && (
                    <Pressable
                      style={styles.timeDoneButton}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.timeDoneText}>Listo</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            {/* Recordatorio */}
            <View style={styles.field}>
              <Text style={styles.label}>Recordatorio</Text>
              <View style={styles.row}>
                {REMINDER_OPTIONS.map((opt) => {
                  const active = reminderOffsetMinutes === opt.value;
                  return (
                    <Pressable
                      key={String(opt.value)}
                      onPress={() => setReminderOffsetMinutes(opt.value)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
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
    paddingBottom: 32,
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
  timePickerContainer: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
  },
  timeDoneButton: {
    alignSelf: "flex-end",
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4b5563",
  },
  timeDoneText: {
    fontSize: 13,
    color: "#e5e7eb",
  },
});
