// app/settings/index.tsx
import {
     applyReminderSettings,
     loadReminderSettings,
     saveReminderSettings,
     type ReminderSettings,
} from "@/core/settings/reminderSettings";
import { Screen } from "@/presentation/components/Screen";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
     ActivityIndicator,
     Pressable,
     StyleSheet,
     Switch,
     Text,
     View,
} from "react-native";

type PresetKey = "morning" | "afternoon" | "night";

const PRESETS: Record<
  PresetKey,
  { label: string; hour: number; minute: number }
> = {
  morning: { label: "Mañana (08:00)", hour: 8, minute: 0 },
  afternoon: { label: "Tarde (13:00)", hour: 13, minute: 0 },
  night: { label: "Noche (21:00)", hour: 21, minute: 0 },
};

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const s = await loadReminderSettings();
      if (!mounted) return;
      setSettings(s);
      setLoading(false);
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  async function updateSettings(partial: Partial<ReminderSettings>) {
    if (!settings) return;
    const next: ReminderSettings = { ...settings, ...partial };
    setSettings(next);
    await saveReminderSettings(next);
    await applyReminderSettings(next);
  }

  function currentPreset(): PresetKey | null {
    if (!settings) return null;
    const match = (
      Object.entries(PRESETS) as [PresetKey, { hour: number; minute: number }][]
    ).find(([, v]) => v.hour === settings.hour && v.minute === settings.minute);
    return match?.[0] ?? null;
  }

  if (loading || !settings) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      </Screen>
    );
  }

  const presetKey = currentPreset();

  return (
    <Screen>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
        >
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Ajustes</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Sección recordatorio diario */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.cardTitle}>Recordatorio diario</Text>
            <Text style={styles.cardSubtitle}>
              Recibe una notificación para revisar tus hábitos.
            </Text>
          </View>

          <Switch
            value={settings.enabled}
            onValueChange={(value) => updateSettings({ enabled: value })}
          />
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Horario</Text>

        <View style={styles.presetRow}>
          {(
            Object.entries(PRESETS) as [PresetKey, typeof PRESETS.morning][]
          ).map(([key, preset]) => {
            const active = presetKey === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.presetButton,
                  active && styles.presetButtonActive,
                ]}
                onPress={() =>
                  updateSettings({ hour: preset.hour, minute: preset.minute })
                }
                disabled={!settings.enabled}
              >
                <Text
                  style={[
                    styles.presetText,
                    active && styles.presetTextActive,
                    !settings.enabled && styles.presetTextDisabled,
                  ]}
                >
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!presetKey && settings.enabled && (
          <Text style={styles.infoText}>
            Tienes un horario personalizado configurado:{" "}
            {settings.hour.toString().padStart(2, "0")}:
            {settings.minute.toString().padStart(2, "0")}
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backIcon: {
    color: "#E5E7EB",
    fontSize: 20,
    marginRight: 2,
  },
  backText: {
    color: "#E5E7EB",
    fontSize: 14,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  card: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "600",
  },
  cardSubtitle: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#1E293B",
    marginVertical: 12,
  },
  sectionLabel: {
    color: "#CBD5F5",
    fontSize: 13,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: "column",
    gap: 8,
  },
  presetButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
  },
  presetButtonActive: {
    backgroundColor: "#38BDF8",
    borderColor: "#38BDF8",
  },
  presetText: {
    color: "#E5E7EB",
    fontSize: 13,
    textAlign: "center",
  },
  presetTextActive: {
    color: "#0F172A",
    fontWeight: "600",
  },
  presetTextDisabled: {
    opacity: 0.5,
  },
  infoText: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 8,
  },
});
