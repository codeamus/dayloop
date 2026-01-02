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
import { colors } from "@/theme/colors";
import { addMinutesHHmm } from "@/utils/time";

const COLOR_OPTIONS = [
  colors.primary,
  colors.success,
  "#5aa9e6",
  "#f08a5d",
  "#c06c84",
];

const EMOJI_OPTIONS = ["🔥", "🌱", "⭐️", "📚", "💧", "💪"];

type HabitType = "daily" | "weekly";
type PickerTarget = "start" | "end";

function hhmmToMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const safeH = Number.isFinite(h) ? Math.max(0, Math.min(23, h)) : 0;
  const safeM = Number.isFinite(m) ? Math.max(0, Math.min(59, m)) : 0;
  return safeH * 60 + safeM;
}

function minutesToHHmm(total: number): string {
  const min = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function buildDateForTime(hhmm: string): Date {
  const d = new Date();
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  d.setHours(h, m, 0, 0);
  return d;
}

export default function HabitNewScreen() {
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const { create, isLoading } = useCreateHabit();

  const REMINDER_OPTIONS = [
    { label: "Sin recordatorio", value: null as null | number },
    { label: "Justo a la hora", value: 0 },
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
  const [color, setColor] = useState<string>(colors.primary);
  const [emoji, setEmoji] = useState<string>("🔥");

  // ✅ Bloque horario
  const [startTime, setStartTime] = useState<string>("08:00");
  const [endTime, setEndTime] = useState<string>(() =>
    addMinutesHHmm("08:00", 30)
  );

  // Picker
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>("start");
  const [pickerDate, setPickerDate] = useState<Date>(() =>
    buildDateForTime("08:00")
  );

  const todayIndex = new Date().getDay(); // 0-6
  const [weeklyDays, setWeeklyDays] = useState<number[]>([todayIndex]);

  const snapPoints = useMemo(() => ["78%"], []);

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

  const openPickerFor = useCallback(
    (target: PickerTarget) => {
      setPickerTarget(target);

      const current = target === "start" ? startTime : endTime;
      setPickerDate(buildDateForTime(current));

      setShowTimePicker(true);
    },
    [startTime, endTime]
  );

  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === "dismissed") {
        if (Platform.OS === "android") setShowTimePicker(false);
        return;
      }

      const d = selectedDate ?? pickerDate;

      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      const picked = `${hh}:${mm}`;

      if (pickerTarget === "start") {
        setStartTime(picked);

        // si el fin queda inválido, lo ajustamos a +30
        const startMin = hhmmToMinutes(picked);
        const endMin = hhmmToMinutes(endTime);
        if (endMin <= startMin) {
          setEndTime(minutesToHHmm(startMin + 30));
        }
      } else {
        // end
        const startMin = hhmmToMinutes(startTime);
        const endMin = hhmmToMinutes(picked);

        if (endMin <= startMin) {
          Alert.alert(
            "Horario inválido",
            "La hora de fin debe ser mayor que la hora de inicio."
          );
        } else {
          setEndTime(picked);
        }
      }

      setPickerDate(d);

      if (Platform.OS === "android") setShowTimePicker(false);
    },
    [pickerDate, pickerTarget, startTime, endTime]
  );

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert("Ponle un nombre", "Ej: Tomar agua, Leer 10 minutos...");
      return;
    }

    const startMin = hhmmToMinutes(startTime);
    const endMin = hhmmToMinutes(endTime);

    if (endMin <= startMin) {
      Alert.alert(
        "Horario inválido",
        "La hora de fin debe ser mayor que la hora de inicio."
      );
      return;
    }

    const payload = {
      name: name.trim(),
      color,
      icon: emoji,
      type,
      startTime,
      endTime,
      weeklyDays: type === "weekly" ? weeklyDays : undefined,
      reminderOffsetMinutes,
    };

    const result = await create(payload);

    if (!result.ok) {
      Alert.alert("No se pudo guardar", "Inténtalo nuevamente.");
      return;
    }

    router.back();
  }, [
    name,
    color,
    emoji,
    type,
    startTime,
    endTime,
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
            <View style={styles.headerRow}>
              <Text style={styles.title}>Nuevo hábito</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {type === "daily" ? "Diario" : "Semanal"}
                </Text>
              </View>
            </View>

            <Text style={styles.subtitle}>
              Define el hábito, el horario y (si quieres) un recordatorio.
            </Text>

            {/* Nombre */}
            <View style={styles.field}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej: Tomar agua"
                placeholderTextColor={colors.mutedText}
                style={styles.input}
              />
            </View>

            {/* Tipo */}
            <View style={styles.field}>
              <Text style={styles.label}>Frecuencia</Text>
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

            {/* Días (solo semanal) */}
            {type === "weekly" && (
              <View style={styles.field}>
                <Text style={styles.label}>Días</Text>
                <WeekdaySelector
                  selectedDays={weeklyDays}
                  onChange={setWeeklyDays}
                />
              </View>
            )}

            {/* Horario */}
            <View style={styles.field}>
              <Text style={styles.label}>Horario</Text>

              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Pressable
                  style={styles.timeButton}
                  onPress={() => openPickerFor("start")}
                >
                  <Text style={styles.timeButtonText}>{startTime}</Text>
                  <View style={styles.timePill}>
                    <Text style={styles.timePillText}>Inicio</Text>
                  </View>
                </Pressable>

                <Pressable
                  style={styles.timeButton}
                  onPress={() => openPickerFor("end")}
                >
                  <Text style={styles.timeButtonText}>{endTime}</Text>
                  <View style={styles.timePill}>
                    <Text style={styles.timePillText}>Fin</Text>
                  </View>
                </Pressable>
              </View>

              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={pickerDate}
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
              <Text style={styles.label}>Ícono</Text>
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
            <View style={styles.footerRow}>
              <Pressable
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.primaryButton, isLoading && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text style={styles.primaryText}>
                  {isLoading ? "Guardando..." : "Guardar hábito"}
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
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  sheetBackground: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: colors.border,
  },
  handleIndicator: {
    backgroundColor: colors.border,
    width: 44,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 12,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    marginTop: -6,
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(230,188,1,0.14)",
    borderWidth: 1,
    borderColor: "rgba(230,188,1,0.35)",
  },
  badgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },

  field: { gap: 8, marginTop: 6 },
  label: { fontSize: 13, color: colors.mutedText, fontWeight: "600" },

  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    backgroundColor: "rgba(43,62,74,0.35)",
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
    borderColor: colors.border,
    backgroundColor: "rgba(43,62,74,0.25)",
  },
  chipActive: {
    backgroundColor: "rgba(230,188,1,0.18)",
    borderColor: "rgba(230,188,1,0.55)",
  },
  chipText: { fontSize: 13, color: colors.text },
  chipTextActive: { color: colors.primary, fontWeight: "700" },

  timeButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(43,62,74,0.25)",
  },
  timeButtonText: { fontSize: 16, color: colors.text, fontWeight: "700" },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.16)",
  },
  timePillText: { color: colors.text, fontSize: 12, fontWeight: "600" },

  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotActive: { borderColor: colors.text },

  emojiChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(43,62,74,0.25)",
  },
  emojiChipActive: {
    backgroundColor: "rgba(142,205,110,0.12)",
    borderColor: "rgba(142,205,110,0.55)",
  },
  emoji: { fontSize: 20 },

  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 10,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(43,62,74,0.20)",
  },
  cancelText: { color: colors.text, fontSize: 14, fontWeight: "600" },

  primaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  primaryText: { color: colors.bg, fontSize: 14, fontWeight: "800" },

  timePickerContainer: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(43,62,74,0.35)",
  },
  timeDoneButton: {
    alignSelf: "flex-end",
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.18)",
    backgroundColor: "rgba(241,233,215,0.08)",
  },
  timeDoneText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "700",
  },
});
