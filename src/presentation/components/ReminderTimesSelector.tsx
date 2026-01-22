// src/presentation/components/ReminderTimesSelector.tsx
import { colors } from "@/theme/colors";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ReminderTimesSelectorProps = {
  times: string[]; // Array de "HH:mm"
  onChange: (times: string[]) => void;
  onSyncTargetRepeats?: (count: number) => void; // Opcional: sincronizar con targetRepeats
};

function formatTime(hhmm: string): string {
  // Mantener formato 24h directamente
  return hhmm;
}

function buildDateForTime(hhmm: string): Date {
  const d = new Date();
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  d.setHours(h, m, 0, 0);
  return d;
}

function minutesToHHmm(total: number): string {
  const min = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function ReminderTimesSelector({
  times,
  onChange,
  onSyncTargetRepeats,
}: ReminderTimesSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [pickerDate, setPickerDate] = useState<Date>(() =>
    buildDateForTime("09:00")
  );

  const handleAddTime = useCallback(() => {
    setEditingIndex(null);
    setPickerDate(buildDateForTime("09:00"));
    setShowPicker(true);
  }, []);

  const handleEditTime = useCallback(
    (index: number) => {
      setEditingIndex(index);
      setPickerDate(buildDateForTime(times[index] || "09:00"));
      setShowPicker(true);
    },
    [times]
  );

  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === "dismissed") {
        if (Platform.OS === "android") setShowPicker(false);
        setEditingIndex(null);
        return;
      }

      // Solo actualizar el pickerDate mientras el usuario selecciona
      // No agregar/editar hasta que confirme
      const d = selectedDate ?? pickerDate;
      setPickerDate(d);

      // En Android, cuando el usuario selecciona la hora, se dispara el evento "set"
      // En iOS, solo actualizamos el pickerDate y esperamos a que presione "Listo"
      if (Platform.OS === "android" && event.type === "set") {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        const newTime = `${hh}:${mm}`;

        if (editingIndex === null) {
          // Agregar nuevo horario
          const newTimes = [...times, newTime].sort();
          onChange(newTimes);
          if (onSyncTargetRepeats) {
            onSyncTargetRepeats(newTimes.length);
          }
        } else {
          // Editar horario existente
          const newTimes = [...times];
          newTimes[editingIndex] = newTime;
          onChange(newTimes.sort());
        }

        setEditingIndex(null);
        setShowPicker(false);
      }
      // En iOS, no hacemos nada aquí, esperamos al botón "Listo"
    },
    [pickerDate, editingIndex, times, onChange, onSyncTargetRepeats]
  );

  const handleRemoveTime = useCallback(
    (index: number) => {
      const newTimes = times.filter((_, i) => i !== index);
      onChange(newTimes);
      if (onSyncTargetRepeats) {
        onSyncTargetRepeats(newTimes.length);
      }
    },
    [times, onChange, onSyncTargetRepeats]
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Horarios de recordatorio</Text>
        <Pressable
          onPress={handleAddTime}
          style={styles.addButton}
          hitSlop={8}
        >
          <Feather name="plus" size={18} color={colors.primary} />
          <Text style={styles.addButtonText}>Agregar</Text>
        </Pressable>
      </View>

      {times.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No hay horarios configurados. Toca "Agregar" para añadir uno.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.timesList}
          contentContainerStyle={styles.timesListContent}
        >
          {times.map((time, index) => (
            <View key={index} style={styles.timeChip}>
              <Text style={styles.timeText}>{formatTime(time)}</Text>
              <Pressable
                onPress={() => handleRemoveTime(index)}
                style={styles.removeButton}
                hitSlop={6}
              >
                <Feather name="x" size={14} color={colors.mutedText} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {showPicker && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={pickerDate}
            mode="time"
            is24Hour={true}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleTimeChange}
            themeVariant="dark"
          />

          {Platform.OS === "ios" && (
            <Pressable
              style={styles.pickerDoneButton}
              onPress={() => {
                // Confirmar y agregar/editar el horario
                const hh = String(pickerDate.getHours()).padStart(2, "0");
                const mm = String(pickerDate.getMinutes()).padStart(2, "0");
                const newTime = `${hh}:${mm}`;

                if (editingIndex === null) {
                  // Agregar nuevo horario
                  const newTimes = [...times, newTime].sort();
                  onChange(newTimes);
                  if (onSyncTargetRepeats) {
                    onSyncTargetRepeats(newTimes.length);
                  }
                } else {
                  // Editar horario existente
                  const newTimes = [...times];
                  newTimes[editingIndex] = newTime;
                  onChange(newTimes.sort());
                }

                setEditingIndex(null);
                setShowPicker(false);
              }}
            >
              <Text style={styles.pickerDoneText}>Listo</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 13,
    color: colors.mutedText,
    fontWeight: "900",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(230,188,1,0.14)",
    borderWidth: 1,
    borderColor: "rgba(230,188,1,0.35)",
  },
  addButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "900",
  },
  emptyState: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(43,62,74,0.15)",
  },
  emptyText: {
    fontSize: 12,
    color: colors.mutedText,
    textAlign: "center",
    lineHeight: 16,
  },
  timesList: {
    maxHeight: 60,
  },
  timesListContent: {
    gap: 8,
    paddingVertical: 4,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(43,62,74,0.25)",
  },
  timeText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "800",
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43,62,74,0.35)",
  },
  pickerContainer: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(43,62,74,0.35)",
  },
  pickerDoneButton: {
    alignSelf: "flex-end",
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(241,233,215,0.18)",
    backgroundColor: "rgba(241,233,215,0.08)",
  },
  pickerDoneText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "900",
  },
});
