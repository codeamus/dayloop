// app/settings/index.tsx
import {
  applyReminderSettings,
  loadReminderSettings,
  saveReminderSettings,
  type ReminderSettings,
} from "@/core/settings/reminderSettings";
import { Screen } from "@/presentation/components/Screen";
import { colors } from "@/theme/colors";
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando ajustes…</Text>
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
        <View style={styles.rowTop}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.cardTitle}>Recordatorio diario</Text>
            <Text style={styles.cardSubtitle}>
              Te avisamos una vez al día para revisar tus hábitos.
            </Text>
          </View>

          <Switch
            value={settings.enabled}
            onValueChange={(value) => updateSettings({ enabled: value })}
            trackColor={{
              false: "rgba(63,90,105,0.9)",
              true: "rgba(230,188,1,0.35)",
            }}
            thumbColor={settings.enabled ? colors.primary : colors.mutedText}
            ios_backgroundColor="rgba(63,90,105,0.9)"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Horario</Text>
          {!settings.enabled && (
            <Text style={styles.sectionHint}>Actívalo para elegir</Text>
          )}
        </View>

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
                  !settings.enabled && styles.presetButtonDisabled,
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
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Horario personalizado:{" "}
              <Text style={styles.infoTextStrong}>
                {settings.hour.toString().padStart(2, "0")}:
                {settings.minute.toString().padStart(2, "0")}
              </Text>
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: colors.mutedText, fontSize: 13 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    justifyContent: "space-between",
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
  backText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },

  card: {
    marginTop: 8,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(50,73,86,0.55)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  cardSubtitle: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
    opacity: 0.9,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionLabel: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  sectionHint: {
    color: "rgba(241,233,215,0.65)",
    fontSize: 12,
    fontWeight: "700",
  },

  presetRow: {
    flexDirection: "column",
    gap: 10,
  },
  presetButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(43,62,74,0.20)",
  },
  presetButtonActive: {
    backgroundColor: "rgba(230,188,1,0.18)",
    borderColor: "rgba(230,188,1,0.55)",
  },
  presetButtonDisabled: {
    opacity: 0.55,
  },

  presetText: {
    color: colors.text,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "800",
  },
  presetTextActive: {
    color: colors.primary,
  },
  presetTextDisabled: {
    color: "rgba(241,233,215,0.75)",
  },

  infoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(43,62,74,0.25)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
  },
  infoTextStrong: {
    color: colors.text,
    fontWeight: "900",
  },
});
