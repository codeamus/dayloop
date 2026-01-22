// src/presentation/components/TimeBlocksSelector.tsx
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

export type TimeBlock = {
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
};

type TimeBlocksSelectorProps = {
  blocks: TimeBlock[];
  onChange: (blocks: TimeBlock[]) => void;
  onSyncTargetRepeats?: (count: number) => void; // Opcional: sincronizar con targetRepeats
};

function formatTime(hhmm: string): string {
  // Mantener formato 24h directamente
  return hhmm;
}

function buildDateForTime(hhmm: string): Date {
  const d = new Date();
  const [hStr, mStr] = hhmm.split(":").map(Number);
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  d.setHours(h, m, 0, 0);
  return d;
}

function hhmmToMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(":").map(Number);
  const h = Number.isFinite(hStr) ? Math.max(0, Math.min(23, hStr)) : 0;
  const m = Number.isFinite(mStr) ? Math.max(0, Math.min(59, mStr)) : 0;
  return h * 60 + m;
}

function minutesToHHmm(total: number): string {
  const min = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function TimeBlocksSelector({
  blocks,
  onChange,
  onSyncTargetRepeats,
}: TimeBlocksSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(
    null
  );
  const [pickerTarget, setPickerTarget] = useState<"start" | "end">("start");
  const [pickerDate, setPickerDate] = useState<Date>(() =>
    buildDateForTime("08:00")
  );

  const handleAddBlock = useCallback(() => {
    setEditingBlockIndex(null);
    setPickerTarget("start");
    setPickerDate(buildDateForTime("08:00"));
    setShowPicker(true);
  }, []);

  const handleEditBlock = useCallback(
    (index: number, target: "start" | "end") => {
      setEditingBlockIndex(index);
      setPickerTarget(target);
      const time = target === "start" ? blocks[index].startTime : blocks[index].endTime;
      setPickerDate(buildDateForTime(time || "08:00"));
      setShowPicker(true);
    },
    [blocks]
  );

  const handleTimeChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === "dismissed") {
        if (Platform.OS === "android") setShowPicker(false);
        setEditingBlockIndex(null);
        return;
      }

      const d = selectedDate ?? pickerDate;
      setPickerDate(d);

      // En Android, cuando el usuario selecciona la hora, se dispara el evento "set"
      // En iOS, solo actualizamos el pickerDate y esperamos a que presione "Listo"
      if (Platform.OS === "android" && event.type === "set") {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        const newTime = `${hh}:${mm}`;

        if (editingBlockIndex === null) {
          // Crear nuevo bloque
          const newBlock: TimeBlock = {
            startTime: newTime,
            endTime: minutesToHHmm(hhmmToMinutes(newTime) + 30),
          };
          const newBlocks = [...blocks, newBlock].sort((a, b) =>
            hhmmToMinutes(a.startTime) - hhmmToMinutes(b.startTime)
          );
          onChange(newBlocks);
          if (onSyncTargetRepeats) {
            onSyncTargetRepeats(newBlocks.length);
          }
        } else {
          // Editar bloque existente
          const newBlocks = [...blocks];
          if (pickerTarget === "start") {
            newBlocks[editingBlockIndex].startTime = newTime;
            // Asegurar que endTime sea mayor que startTime
            const startMin = hhmmToMinutes(newTime);
            const endMin = hhmmToMinutes(newBlocks[editingBlockIndex].endTime);
            if (endMin <= startMin) {
              newBlocks[editingBlockIndex].endTime = minutesToHHmm(startMin + 30);
            }
          } else {
            newBlocks[editingBlockIndex].endTime = newTime;
            // Asegurar que endTime sea mayor que startTime
            const endMin = hhmmToMinutes(newTime);
            const startMin = hhmmToMinutes(newBlocks[editingBlockIndex].startTime);
            if (endMin <= startMin) {
              newBlocks[editingBlockIndex].startTime = minutesToHHmm(endMin - 30);
            }
          }
          onChange(newBlocks.sort((a, b) =>
            hhmmToMinutes(a.startTime) - hhmmToMinutes(b.startTime)
          ));
        }

        setEditingBlockIndex(null);
        setShowPicker(false);
      }
    },
    [pickerDate, editingBlockIndex, pickerTarget, blocks, onChange, onSyncTargetRepeats]
  );

  const handleRemoveBlock = useCallback(
    (index: number) => {
      const newBlocks = blocks.filter((_, i) => i !== index);
      onChange(newBlocks);
      if (onSyncTargetRepeats) {
        onSyncTargetRepeats(newBlocks.length);
      }
    },
    [blocks, onChange, onSyncTargetRepeats]
  );

  const handleConfirmIOS = useCallback(() => {
    const hh = String(pickerDate.getHours()).padStart(2, "0");
    const mm = String(pickerDate.getMinutes()).padStart(2, "0");
    const newTime = `${hh}:${mm}`;

    if (editingBlockIndex === null) {
      // Crear nuevo bloque
      const newBlock: TimeBlock = {
        startTime: newTime,
        endTime: minutesToHHmm(hhmmToMinutes(newTime) + 30),
      };
      const newBlocks = [...blocks, newBlock].sort((a, b) =>
        hhmmToMinutes(a.startTime) - hhmmToMinutes(b.startTime)
      );
      onChange(newBlocks);
      if (onSyncTargetRepeats) {
        onSyncTargetRepeats(newBlocks.length);
      }
    } else {
      // Editar bloque existente
      const newBlocks = [...blocks];
      if (pickerTarget === "start") {
        newBlocks[editingBlockIndex].startTime = newTime;
        // Asegurar que endTime sea mayor que startTime
        const startMin = hhmmToMinutes(newTime);
        const endMin = hhmmToMinutes(newBlocks[editingBlockIndex].endTime);
        if (endMin <= startMin) {
          newBlocks[editingBlockIndex].endTime = minutesToHHmm(startMin + 30);
        }
      } else {
        newBlocks[editingBlockIndex].endTime = newTime;
        // Asegurar que endTime sea mayor que startTime
        const endMin = hhmmToMinutes(newTime);
        const startMin = hhmmToMinutes(newBlocks[editingBlockIndex].startTime);
        if (endMin <= startMin) {
          newBlocks[editingBlockIndex].startTime = minutesToHHmm(endMin - 30);
        }
      }
      onChange(newBlocks.sort((a, b) =>
        hhmmToMinutes(a.startTime) - hhmmToMinutes(b.startTime)
      ));
    }

    setEditingBlockIndex(null);
    setShowPicker(false);
  }, [pickerDate, editingBlockIndex, pickerTarget, blocks, onChange, onSyncTargetRepeats]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Bloques de tiempo</Text>
        <Pressable
          onPress={handleAddBlock}
          style={styles.addButton}
          hitSlop={8}
        >
          <Feather name="plus" size={18} color={colors.primary} />
          <Text style={styles.addButtonText}>Agregar</Text>
        </Pressable>
      </View>

      {blocks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No hay bloques configurados. Toca "Agregar" para añadir uno.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.blocksList}
          contentContainerStyle={styles.blocksListContent}
        >
          {blocks.map((block, index) => (
            <View key={index} style={styles.blockChip}>
              <Pressable
                onPress={() => handleEditBlock(index, "start")}
                style={styles.timeButton}
              >
                <Text style={styles.timeText}>{formatTime(block.startTime)}</Text>
                <Text style={styles.timeLabel}>Inicio</Text>
              </Pressable>
              <Text style={styles.separator}>–</Text>
              <Pressable
                onPress={() => handleEditBlock(index, "end")}
                style={styles.timeButton}
              >
                <Text style={styles.timeText}>{formatTime(block.endTime)}</Text>
                <Text style={styles.timeLabel}>Fin</Text>
              </Pressable>
              <Pressable
                onPress={() => handleRemoveBlock(index)}
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
          <Text style={styles.pickerLabel}>
            {editingBlockIndex === null
              ? "Nuevo bloque"
              : `Editar ${pickerTarget === "start" ? "inicio" : "fin"}`}
          </Text>
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
              onPress={handleConfirmIOS}
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
  blocksList: {
    maxHeight: 80,
  },
  blocksListContent: {
    gap: 8,
    paddingVertical: 4,
  },
  blockChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(43,62,74,0.25)",
  },
  timeButton: {
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "800",
  },
  timeLabel: {
    fontSize: 10,
    color: colors.mutedText,
    fontWeight: "700",
  },
  separator: {
    fontSize: 14,
    color: colors.mutedText,
    fontWeight: "800",
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43,62,74,0.35)",
    marginLeft: 4,
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
  pickerLabel: {
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: "800",
    marginBottom: 8,
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
