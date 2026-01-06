// app/settings/index.tsx
import { Screen } from "@/presentation/components/Screen";
import { colors } from "@/theme/colors";
import * as Notifications from "expo-notifications";
import { Link, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PermissionState = "loading" | "granted" | "denied" | "undetermined";

export default function SettingsScreen() {
  const [permState, setPermState] = useState<PermissionState>("loading");
  const [busy, setBusy] = useState(false);

  // ✅ Android: channel
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
        return "Las notificaciones están activadas. Te ayudaremos con recordatorios.";
      case "denied":
        return "Están desactivadas. Puedes activarlas desde Ajustes del teléfono.";
      case "undetermined":
        return "Actívalas para recibir recordatorios de tus hábitos.";
      default:
        return "Cargando…";
    }
  }, [permState]);

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

  // ✅ TEST 5s: agenda una notificación de prueba
  async function testNotificationIn5s() {
    try {
      setBusy(true);

      await ensureAndroidChannel();

      const ok = await ensurePermission();
      await refreshPermission();

      if (!ok) {
        Alert.alert("Permiso requerido", "Activa notificaciones para probar.");
        return;
      }

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "DEBUG DAYLOOP",
          body: "Si ves esto, las notificaciones funcionan ✅",
          sound: Platform.OS === "ios" ? "default" : undefined,
        },
        trigger: { seconds: 5 },
      });

      Alert.alert("Listo", `Programada en 5s.\nID: ${id}`);
    } catch (e) {
      console.error("[Settings] testNotificationIn5s error", e);
      Alert.alert("Error", "Falló la prueba de notificación.");
    } finally {
      setBusy(false);
      await refreshPermission();
    }
  }

  // ✅ LISTAR: muestra un preview de las primeras 8
  async function listScheduledNotifications() {
    try {
      setBusy(true);

      const all = await Notifications.getAllScheduledNotificationsAsync();
      if (!all.length) {
        Alert.alert("Programadas", "No hay notificaciones programadas.");
        return;
      }

      const preview = all
        .slice(0, 8)
        .map((n, i) => {
          const title = n.content?.title ?? "(sin título)";
          const body = n.content?.body ?? "";
          const trigger = JSON.stringify(n.trigger ?? {});
          return `${i + 1}) ${title} — ${body}\nID: ${
            n.identifier
          }\nTrigger: ${trigger}`;
        })
        .join("\n\n");

      Alert.alert(
        `Programadas (${all.length})`,
        preview.length > 3500 ? preview.slice(0, 3500) + "…" : preview
      );
    } catch (e) {
      console.error("[Settings] listScheduledNotifications error", e);
      Alert.alert("Error", "No se pudieron listar las programadas.");
    } finally {
      setBusy(false);
    }
  }

  // ✅ BORRAR TODAS: clave para limpiar duplicados viejos
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

  const isGranted = permState === "granted";
  const showEnableButton = permState === "undetermined";
  const showSystemHint = permState === "denied";

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

      {/* Notificaciones */}
      <View style={styles.card}>
        <View style={styles.rowTop}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.cardTitle}>Notificaciones</Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>

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

        <View style={styles.divider} />

        <Pressable
          style={[styles.primaryButton, busy && { opacity: 0.6 }]}
          onPress={testNotificationIn5s}
          disabled={busy}
        >
          <Text style={styles.primaryButtonText}>
            {busy ? "Probando…" : "Test notificación (5s)"}
          </Text>
        </Pressable>

        <View style={{ height: 10 }} />

        <Pressable
          style={[styles.cancelButton, busy && { opacity: 0.6 }]}
          onPress={listScheduledNotifications}
          disabled={busy}
        >
          <Text style={styles.cancelText}>Ver notificaciones programadas</Text>
        </Pressable>

        <View style={{ height: 10 }} />

        <Pressable
          style={[styles.dangerButton, busy && { opacity: 0.6 }]}
          onPress={cancelAllScheduledNotifications}
          disabled={busy}
        >
          <Text style={styles.dangerText}>Borrar TODAS las programadas</Text>
        </Pressable>

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
                (iOS/Android no permiten volver a mostrar el prompt cuando
                eliges “No permitir”.)
              </Text>
            </View>
          </>
        )}

        {/* Opcional: link a privacy policy (recomendado para stores) */}
        <View style={styles.divider} />
        <Link href="https://codeamus.dev/dayloop/privacy" asChild>
          <Pressable style={styles.linkRow}>
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Text style={styles.linkArrow}>›</Text>
          </Pressable>
        </Link>
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
    alignItems: "flex-start",
    gap: 12,
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
