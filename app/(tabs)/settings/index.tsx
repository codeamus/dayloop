// app/(tabs)/settings/index.tsx
import { resetDatabase } from "@/data/sqlite/database";
import { Screen } from "@/presentation/components/Screen";
import { useCalendarSync } from "@/presentation/hooks/useCalendarSync";
import { colors } from "@/theme/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { Link, router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

type PermissionState = "loading" | "granted" | "denied" | "undetermined";

let StoreReview: typeof import("expo-store-review") | null = null;
try {
  StoreReview = require("expo-store-review");
} catch {
  StoreReview = null;
}

const APP_STORE_REVIEW_URL =
  "https://apps.apple.com/es/app/dayloop-h%C3%A1bitos-diarios/id6757437094?action=write-review";

const PLAY_STORE_REVIEW_URL = (packageName: string) =>
  `https://play.google.com/store/apps/details?id=com.codeamus.dayloop&reviewId=0`;

export default function SettingsScreen() {
  const [permState, setPermState] = useState<PermissionState>("loading");
  const [busy, setBusy] = useState(false);

  const {
    isIOS,
    calendarSyncEnabled,
    setCalendarSyncEnabled,
    requestPermission: requestCalendarPermission,
    syncNow,
    syncing: calendarSyncing,
  } = useCalendarSync();

  const [calendarBusy, setCalendarBusy] = useState(false);

  const onCalendarSyncChange = useCallback(
    async (value: boolean) => {
      if (calendarBusy) return;
      setCalendarBusy(true);
      try {
        await setCalendarSyncEnabled(value);
        if (value && isIOS) {
          const ok = await requestCalendarPermission();
          if (ok) await syncNow();
        }
      } catch (e) {
        if (__DEV__) console.warn("[Settings] calendar sync toggle", e);
      } finally {
        setCalendarBusy(false);
      }
    },
    [
      calendarBusy,
      setCalendarSyncEnabled,
      isIOS,
      requestCalendarPermission,
      syncNow,
    ]
  );

  // =========================
  // Notificaciones
  // =========================
  async function ensureAndroidChannel() {
    if (Platform.OS !== "android") return;
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  async function ensurePermission(): Promise<boolean> {
    const perm = await Notifications.getPermissionsAsync();
    if (perm.status === "granted") return true;

    const req = await Notifications.requestPermissionsAsync();
    return req.status === "granted";
  }

  async function refreshPermission() {
    const res = await Notifications.getPermissionsAsync();
    const status = res.status;

    if (status === "granted") setPermState("granted");
    else if (status === "denied") setPermState("denied");
    else setPermState("undetermined");
  }

  useEffect(() => {
    refreshPermission();
  }, []);

  const subtitle = useMemo(() => {
    switch (permState) {
      case "granted":
        return "Activadas. Te ayudaremos con recordatorios.";
      case "denied":
        return "Desactivadas. Debes activarlas desde Ajustes del teléfono.";
      case "undetermined":
        return "Actívalas para recibir recordatorios de tus hábitos.";
      default:
        return "Cargando…";
    }
  }, [permState]);

  const isGranted = permState === "granted";
  const showEnableButton = permState === "undetermined";
  const showSystemHint = permState === "denied";

  async function openSystemNotificationSettings() {
    // iOS: Linking.openSettings abre la app en Ajustes
    // Android: también abre Ajustes de la app
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert("No disponible", "No se pudo abrir Ajustes del sistema.");
    }
  }

  async function onPressEnable() {
    try {
      setBusy(true);

      await ensureAndroidChannel();
      const ok = await ensurePermission();
      await refreshPermission();

      if (!ok) {
        Alert.alert(
          "Notificaciones desactivadas",
          "Para activarlas debes hacerlo desde Ajustes del teléfono (Notificaciones → Dayloop)."
        );
      }
    } catch (e) {
      console.error("[Settings] requestPermissionsAsync failed", e);
      Alert.alert(
        "Error",
        "No se pudieron solicitar permisos de notificaciones. Intenta de nuevo."
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancelAllScheduledNotifications() {
    try {
      setBusy(true);
      await Notifications.cancelAllScheduledNotificationsAsync();
      Alert.alert("Listo", "Se borraron TODAS las notificaciones programadas.");
    } catch (e) {
      console.error("[Settings] cancelAllScheduledNotifications error", e);
      Alert.alert("Error", "No se pudieron borrar las programadas.");
    } finally {
      setBusy(false);
    }
  }

  // =========================
  // Privacidad / Reset
  // =========================
  async function onPressResetApp() {
    Alert.alert(
      "Resetear app",
      "Esto borrará datos locales (hábitos, logs, ajustes) y notificaciones programadas.\n\n¿Continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Resetear",
          style: "destructive",
          onPress: async () => {
            try {
              setBusy(true);
              await Notifications.cancelAllScheduledNotificationsAsync();
              resetDatabase();
              await AsyncStorage.clear();
              Alert.alert(
                "Listo",
                "La app quedó limpia (como recién instalada)."
              );
            } catch (e) {
              console.error("[Settings] resetApp error", e);
              Alert.alert("Error", "No se pudo resetear la app.");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

  // =========================
  // Soporte
  // =========================
  async function onPressRateApp() {
    try {
      // 1) Intentar prompt nativo (mejor UX)
      if (StoreReview) {
        const available = await StoreReview.isAvailableAsync();
        if (available) {
          await StoreReview.requestReview();
          return;
        }
      }

      // 2) Fallback: abrir store
      if (Platform.OS === "ios") {
        await Linking.openURL(APP_STORE_REVIEW_URL);
        return;
      }

      // Android
      const pkg = Application.applicationId; // ✅ expo-application
      if (!pkg) {
        Alert.alert(
          "No disponible",
          "No se pudo obtener el package de Android."
        );
        return;
      }
      await Linking.openURL(PLAY_STORE_REVIEW_URL(pkg));
    } catch (e) {
      console.error("[Settings] rateApp error", e);
      Alert.alert("No disponible", "No se pudo abrir la pantalla de reseña.");
    }
  }

  // =========================
  // Info
  // =========================
  const versionLabel = useMemo(() => {
    const v =
      Application.nativeApplicationVersion ??
      Application.applicationVersion ??
      "—";
    const build =
      Application.nativeBuildVersion ??
      Application.applicationBuildVersion ??
      "—";
    return `v${v} (${build})`;
  }, []);

  if (permState === "loading") {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando ajustes…</Text>
        </View>
      </Screen>
    );
  }

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

      <ScrollView>
        {/* =========================
          NOTIFICACIONES
         ========================= */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notificaciones</Text>
            <View
              style={[
                styles.statusPill,
                isGranted ? styles.statusPillOn : styles.statusPillOff,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isGranted ? styles.statusTextOn : styles.statusTextOff,
                ]}
              >
                {isGranted ? "Activadas" : "Desactivadas"}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionSubtitle}>{subtitle}</Text>

          <View style={{ height: 12 }} />

          {/* Switch “habilitar/deshabilitar” (realista: atajo a Ajustes) */}
          <Pressable
            style={styles.row}
            onPress={openSystemNotificationSettings}
            disabled={busy}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.rowTitle}>Habilitar / deshabilitar</Text>
              <Text style={styles.rowSubtitle}>
                Se cambia desde Ajustes del sistema.
              </Text>
            </View>
            <Switch
              value={isGranted}
              onValueChange={() => openSystemNotificationSettings()}
              thumbColor={Platform.OS === "android" ? colors.text : undefined}
              trackColor={{
                false: "rgba(255,255,255,0.18)",
                true: colors.primary,
              }}
              disabled={busy}
            />
          </Pressable>

          {showEnableButton && (
            <>
              <View style={styles.divider} />
              <Pressable
                style={[styles.primaryButton, busy && { opacity: 0.6 }]}
                onPress={onPressEnable}
                disabled={busy}
              >
                <Text style={styles.primaryButtonText}>
                  {busy ? "Solicitando…" : "Activar notificaciones"}
                </Text>
              </Pressable>
            </>
          )}

          {showSystemHint && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Ya las rechazaste antes. Para activarlas:
                </Text>

                <Text style={styles.steps}>
                  1) Ajustes del teléfono{"\n"}
                  2) Notificaciones{"\n"}
                  3) Dayloop{"\n"}
                  4) Permitir notificaciones
                </Text>

                <Text style={styles.infoTextMuted}>
                  (iOS/Android no permiten volver a mostrar el prompt si eliges
                  “No permitir”.)
                </Text>

                <View style={{ height: 10 }} />

                <Pressable
                  style={[styles.cancelButton, busy && { opacity: 0.6 }]}
                  onPress={openSystemNotificationSettings}
                  disabled={busy}
                >
                  <Text style={styles.cancelText}>Abrir Ajustes</Text>
                </Pressable>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <Pressable
            style={[styles.dangerButton, busy && { opacity: 0.6 }]}
            onPress={cancelAllScheduledNotifications}
            disabled={busy}
          >
            <Text style={styles.dangerText}>
              Borrar notificaciones programadas
            </Text>
          </Pressable>
        </View>

        {/* =========================
          CALENDARIO iOS
         ========================= */}
        {isIOS && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Calendario</Text>
            <Text style={styles.sectionSubtitle}>
              Sincroniza hábitos con la app Calendario de Apple. Aparecen en el
              calendario "Dayloop" en color amarillo.
            </Text>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.rowTitle}>
                  Sincronizar con Calendario iOS
                </Text>
                <Text style={styles.rowSubtitle}>
                  {calendarSyncEnabled
                    ? "Hábitos visibles en Calendario. Se actualiza al crear, editar o eliminar."
                    : "Actívalo para ver tus hábitos en la app Calendario."}
                </Text>
              </View>
              <Switch
                value={calendarSyncEnabled}
                onValueChange={onCalendarSyncChange}
                disabled={calendarBusy || calendarSyncing}
                thumbColor={colors.text}
                trackColor={{
                  false: "rgba(255,255,255,0.18)",
                  true: colors.primary,
                }}
              />
            </View>
          </View>
        )}

        {/* =========================
          PRIVACIDAD
         ========================= */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Privacidad</Text>
          <Text style={styles.sectionSubtitle}>
            Control total sobre tus datos locales.
          </Text>

          <View style={styles.divider} />

          <Pressable
            style={[styles.dangerButton, busy && { opacity: 0.6 }]}
            onPress={onPressResetApp}
            disabled={busy}
          >
            <Text style={styles.dangerText}>Borrar datos / Reset app</Text>
          </Pressable>
        </View>

        {/* =========================
          SOPORTE
         ========================= */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Soporte</Text>
          <Text style={styles.sectionSubtitle}>
            Envíanos feedback o deja una reseña.
          </Text>

          <View style={styles.divider} />

          <Pressable
            style={[styles.cancelButton, busy && { opacity: 0.6 }]}
            onPress={onPressRateApp}
            disabled={busy}
          >
            <Text style={styles.cancelText}>Dejar reseña ⭐️</Text>
          </Pressable>
        </View>

        {/* =========================
          INFO
         ========================= */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Info</Text>
          <Text style={styles.sectionSubtitle}>Versión y documentos.</Text>

          <View style={styles.divider} />

          <View style={styles.rowStatic}>
            <Text style={styles.rowTitle}>Versión</Text>
            <Text style={styles.rowValue}>{versionLabel}</Text>
          </View>

          <View style={styles.divider} />

          <Link href="https://codeamus.dev/dayloop/terms" asChild>
            <Pressable style={styles.linkRow}>
              <Text style={styles.linkText}>Términos</Text>
              <Text style={styles.linkArrow}>›</Text>
            </Pressable>
          </Link>

          <View style={{ height: 10 }} />

          <Link href="https://codeamus.dev/dayloop/privacy" asChild>
            <Pressable style={styles.linkRow}>
              <Text style={styles.linkText}>Privacidad</Text>
              <Text style={styles.linkArrow}>›</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
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
    marginTop: 10,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(50,73,86,0.55)",
    borderWidth: 1,
    borderColor: colors.border,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  sectionSubtitle: {
    color: colors.mutedText,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statusPillOn: {
    backgroundColor: "rgba(142,205,110,0.12)",
    borderColor: "rgba(142,205,110,0.30)",
  },
  statusPillOff: {
    backgroundColor: "rgba(230,188,1,0.10)",
    borderColor: "rgba(230,188,1,0.30)",
  },
  statusText: { fontSize: 12, fontWeight: "900" },
  statusTextOn: { color: colors.success },
  statusTextOff: { color: colors.primary },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
    opacity: 0.9,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  rowStatic: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 6,
  },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  rowSubtitle: {
    marginTop: 4,
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
  },
  rowValue: {
    color: "rgba(241,233,215,0.85)",
    fontSize: 12,
    fontWeight: "800",
  },

  primaryButton: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: colors.bg, fontSize: 15, fontWeight: "900" },

  cancelButton: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(43,62,74,0.25)",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: colors.text, fontSize: 14, fontWeight: "900" },

  dangerButton: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(220, 70, 70, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(220, 70, 70, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerText: { color: colors.text, fontSize: 14, fontWeight: "900" },

  infoBox: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(43,62,74,0.25)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: { color: colors.text, fontSize: 12, fontWeight: "800" },
  steps: {
    marginTop: 8,
    color: "rgba(241,233,215,0.85)",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  infoTextMuted: {
    marginTop: 10,
    color: colors.mutedText,
    fontSize: 12,
    lineHeight: 16,
  },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  linkText: { color: colors.text, fontSize: 13, fontWeight: "800" },
  linkArrow: { color: colors.mutedText, fontSize: 18, fontWeight: "900" },
});
