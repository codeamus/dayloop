// app/habit-new.tsx
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// ❌ YA NO usamos scheduleHabitReminder (era repeats=true y no respeta weekly/monthly)
// import { scheduleHabitReminder } from "@/core/notifications/notifications";
import { ColorPickerSheet } from "@/presentation/components/ColorPickerSheet";
import { EmojiPickerSheet } from "@/presentation/components/EmojiPickerSheet";
import { ReminderTimesSelector } from "@/presentation/components/ReminderTimesSelector";
import { Screen } from "@/presentation/components/Screen";
import { TargetSelector } from "@/presentation/components/TargetSelector";
import WeekdaySelector from "@/presentation/components/WeekdaySelector";
import { useCreateHabit } from "@/presentation/hooks/useCreateHabit";
import { colors } from "@/theme/colors";
import { addMinutesHHmm } from "@/utils/time";
import { Feather } from "@expo/vector-icons";

type HabitType = "daily" | "weekly" | "monthly";
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

function uniqSorted(nums: number[]) {
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function clampDaysOfMonth(days: number[]) {
  return uniqSorted(
    days
      .map((d) => Number(d))
      .filter((d) => Number.isFinite(d) && d >= 1 && d <= 31)
  );
}

function DayOfMonthSelector({
  selectedDays,
  onChange,
}: {
  selectedDays: number[];
  onChange: (days: number[]) => void;
}) {
  const toggle = (d: number) => {
    if (selectedDays.includes(d)) onChange(selectedDays.filter((x) => x !== d));
    else onChange(clampDaysOfMonth([...selectedDays, d]));
  };

  return (
    <View style={styles.domGrid}>
      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
        const active = selectedDays.includes(d);
        return (
          <Pressable
            key={d}
            onPress={() => toggle(d)}
            style={[styles.domChip, active && styles.domChipActive]}
            hitSlop={6}
          >
            <Text
              style={[styles.domChipText, active && styles.domChipTextActive]}
            >
              {d}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function HabitNewScreen() {
  const { create, isLoading } = useCreateHabit();

  const REMINDER_OPTIONS = useMemo(
    () => [
      { label: "Sin recordatorio", value: null as null | number },
      { label: "Justo a la hora", value: 0 },
      { label: "5 min antes", value: 5 },
      { label: "10 min antes", value: 10 },
      { label: "30 min antes", value: 30 },
      { label: "1 hora antes", value: 60 },
    ],
    []
  );

  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<
    number | null
  >(0);

  // ✅ Múltiples horarios de recordatorio
  const [reminderTimes, setReminderTimes] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [type, setType] = useState<HabitType>("daily");
  const [color, setColor] = useState<string>(colors.primary);

  // ✅ Ícono seleccionado (emoji)
  const [emoji, setEmoji] = useState<string>("🔥");
  const [isEmojiSheetOpen, setIsEmojiSheetOpen] = useState(false);

  // ✅ Objetivo diario (repeticiones)
  const [targetRepeats, setTargetRepeats] = useState<number>(1);

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
  const [isColorSheetOpen, setIsColorSheetOpen] = useState(false);

  // Weekly
  const todayIndex = new Date().getDay(); // 0-6
  const [weeklyDays, setWeeklyDays] = useState<number[]>([todayIndex]);

  // Monthly
  const todayDayOfMonth = new Date().getDate(); // 1-31
  const [monthlyDays, setMonthlyDays] = useState<number[]>([todayDayOfMonth]);

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
        const startMin = hhmmToMinutes(picked);
        const endMin = hhmmToMinutes(endTime);
        if (endMin <= startMin) setEndTime(minutesToHHmm(startMin + 30));
      } else {
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

    if (type === "weekly" && weeklyDays.length === 0) {
      Alert.alert("Selecciona días", "Para semanal elige al menos 1 día.");
      return;
    }

    if (type === "monthly" && monthlyDays.length === 0) {
      Alert.alert(
        "Selecciona días",
        "Para mensual elige al menos 1 día del mes."
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

      // ⚠️ OJO: tu usecase espera "monthDays" (no monthlyDays)
      monthDays: type === "monthly" ? monthlyDays : undefined,

      reminderOffsetMinutes: reminderTimes.length > 0 ? null : reminderOffsetMinutes, // Si hay reminderTimes, no usar offset
      reminderTimes: reminderTimes.length > 0 ? reminderTimes : undefined,
      date: undefined as any, // opcional, el usecase usa today si no viene
      targetRepeats,
    };

    const result = await create(payload);

    if (!result?.ok) {
      Alert.alert("No se pudo guardar", "Inténtalo nuevamente.");
      return;
    }

    // ✅ IMPORTANTE:
    // Ya NO agendas aquí.
    // - CreateHabit (domain) agenda + guarda notificationIds (respetando weekly/monthly)
    // - useCreateHabit (hook) también hace reschedule/cancel robusto (blindaje)
    router.back();
  }, [
    name,
    color,
    emoji,
    type,
    startTime,
    endTime,
    weeklyDays,
    monthlyDays,
    reminderOffsetMinutes,
    reminderTimes,
    targetRepeats,
    create,
  ]);

  const isBlockingScroll = showTimePicker || isEmojiSheetOpen;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        scrollEnabled={!isBlockingScroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={10}
          >
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backText}>Volver</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Nuevo hábito</Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {type === "daily"
                ? "Diario"
                : type === "weekly"
                ? "Semanal"
                : "Mensual"}
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

        {/* Frecuencia */}
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
            <ToggleChip
              label="Mensual"
              active={type === "monthly"}
              onPress={() => setType("monthly")}
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

        {/* Días del mes (solo mensual) */}
        {type === "monthly" && (
          <View style={styles.field}>
            <Text style={styles.label}>Días del mes</Text>
            <Text style={styles.helper}>
              Ej: 1, 15, 30. Si el mes no tiene 31, se usa el último día.
            </Text>
            <DayOfMonthSelector
              selectedDays={monthlyDays}
              onChange={setMonthlyDays}
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
          <View style={styles.timeHintRow}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={styles.timeHintText}>
              Inicio = cuando comienza tu hábito.{"\n"}Fin = cuando termina.
            </Text>
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

        {/* Horarios de recordatorio personalizados */}
        <View style={styles.field}>
          <ReminderTimesSelector
            times={reminderTimes}
            onChange={setReminderTimes}
            onSyncTargetRepeats={(count) => {
              // Opcional: sincronizar targetRepeats con cantidad de horarios
              if (count > 0) {
                setTargetRepeats(count);
              }
            }}
          />
        </View>

        {/* Recordatorio (legacy - mantener para compatibilidad) */}
        <View style={styles.field}>
          <Text style={styles.label}>Recordatorio (opcional)</Text>
          <Text style={styles.helper}>
            Si no usas horarios personalizados arriba, puedes usar esta opción
            para un recordatorio relativo al inicio del hábito.
          </Text>
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
                    style={[styles.chipText, active && styles.chipTextActive]}
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

          <View style={styles.iconPickerRow}>
            <View style={[styles.iconPreview, { backgroundColor: color }]} />
            <Pressable
              onPress={() => setIsColorSheetOpen(true)}
              style={styles.iconPickerButton}
              hitSlop={10}
            >
              <Text style={styles.iconPickerButtonText}>Elegir color</Text>
            </Pressable>
          </View>
        </View>
        <ColorPickerSheet
          visible={isColorSheetOpen}
          value={color}
          onClose={() => setIsColorSheetOpen(false)}
          onSelect={(c) => setColor(c)}
        />

        {/* Ícono */}
        <View style={styles.field}>
          <Text style={styles.label}>Ícono</Text>

          <View style={styles.iconPickerRow}>
            <View style={styles.iconPreview}>
              <Text style={styles.iconPreviewText}>{emoji || "🙂"}</Text>
            </View>

            <Pressable
              onPress={() => setIsEmojiSheetOpen(true)}
              style={styles.iconPickerButton}
              hitSlop={10}
            >
              <Text style={styles.iconPickerButtonText}>
                {emoji ? "Cambiar ícono" : "Elegir ícono"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Objetivo diario */}
        <View style={styles.field}>
          <TargetSelector
            value={targetRepeats}
            onChange={setTargetRepeats}
            min={1}
            max={20}
          />
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Pressable
            style={styles.cancelButton}
            onPress={() => router.back()}
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
      </ScrollView>

      {/* ✅ BottomSheetModal del emoji (ya NO está dentro de otro sheet) */}
      <EmojiPickerSheet
        visible={isEmojiSheetOpen}
        value={emoji}
        onClose={() => setIsEmojiSheetOpen(false)}
        onSelect={(e) => setEmoji(e)}
      />
    </Screen>
  );
}

function ToggleChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
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
  content: {
    paddingTop: 14,
    paddingBottom: 48,
    gap: 12,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(50,73,86,0.40)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  backIcon: {
    color: colors.text,
    fontSize: 18,
    marginRight: 2,
    fontWeight: "900",
  },
  backText: { color: colors.text, fontSize: 13, fontWeight: "800" },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },

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
  badgeText: { fontSize: 12, color: colors.primary, fontWeight: "800" },

  field: { gap: 8, marginTop: 6 },
  label: { fontSize: 13, color: colors.mutedText, fontWeight: "900" },
  helper: { fontSize: 12, color: colors.mutedText, lineHeight: 16 },
  timeHintRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.14)",
    backgroundColor: "rgba(241,233,215,0.08)",
  },
  timeHintText: {
    flex: 1,
    fontSize: 12,
    color: colors.mutedText,
    lineHeight: 16,
    fontWeight: "800",
  },

  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    backgroundColor: "rgba(43,62,74,0.35)",
    fontWeight: "700",
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
  chipText: { fontSize: 13, color: colors.text, fontWeight: "800" },
  chipTextActive: { color: colors.primary, fontWeight: "900" },

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
  timeButtonText: { fontSize: 16, color: colors.text, fontWeight: "900" },
  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.16)",
  },
  timePillText: { color: colors.text, fontSize: 12, fontWeight: "800" },

  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotActive: { borderColor: colors.text },

  // ✅ Ícono picker UI
  iconPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconPreview: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43,62,74,0.35)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconPreviewText: { fontSize: 26 },
  iconPickerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(241,233,215,0.10)",
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconPickerButtonText: { color: colors.text, fontSize: 13, fontWeight: "900" },

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
  cancelText: { color: colors.text, fontSize: 14, fontWeight: "800" },

  primaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  primaryText: { color: colors.bg, fontSize: 14, fontWeight: "900" },

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
  timeDoneText: { fontSize: 13, color: colors.text, fontWeight: "900" },

  // 📅 grid mensual
  domGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  domChip: {
    width: 40,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43,62,74,0.22)",
  },
  domChipActive: {
    backgroundColor: "rgba(230,188,1,0.18)",
    borderColor: "rgba(230,188,1,0.55)",
  },
  domChipText: { color: colors.text, fontWeight: "800", fontSize: 12 },
  domChipTextActive: { color: colors.primary, fontWeight: "900" },
});
