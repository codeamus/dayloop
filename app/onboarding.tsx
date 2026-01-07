// app/onboarding.tsx
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { setHasSeenOnboarding } from "@/core/settings/onboardingSettings";
import { colors } from "@/theme/colors";

type Step = {
  title: string;
  body: string;
  primary: string;
  secondary?: string;
  onPrimary?: () => Promise<void> | void;
  onSecondary?: () => Promise<void> | void;
};

async function requestNotifPermissionSafe() {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === "granted") return true;

    const req = await Notifications.requestPermissionsAsync();
    return req.status === "granted";
  } catch {
    return false;
  }
}

export default function OnboardingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    await setHasSeenOnboarding(true);
    router.replace("/"); // ✅ home real
  };

  const steps: Step[] = useMemo(
    () => [
      {
        title: "Crea hábitos sin presión",
        body: "Dayloop te ayuda a construir hábitos diarios de forma simple y constante.",
        primary: "Continuar",
        onPrimary: () => setStepIndex(1),
      },
      {
        title: "Marca, repite, progresa",
        body: "Crea hábitos, márcalos como completados y mantén tu constancia día a día.",
        primary: "Continuar",
        onPrimary: () => setStepIndex(2),
      },
      {
        title: "Recordatorios que te ayudan",
        body: "Activa notificaciones para recibir recordatorios en los horarios que tú elijas.",
        primary: "Activar recordatorios",
        secondary: "Ahora no",
        onPrimary: async () => {
          if (busy) return;
          setBusy(true);
          await requestNotifPermissionSafe(); // ✅ sin hook (sin loops)
          await finish();
        },
        onSecondary: async () => {
          if (busy) return;
          setBusy(true);
          await finish();
        },
      },
    ],
    [busy]
  );

  const step = steps[stepIndex];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        padding: 24,
        justifyContent: "space-between",
      }}
    >
      <View style={{ marginTop: 56 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            marginBottom: 12,
            color: "white",
          }}
        >
          {step.title}
        </Text>

        <Text
          style={{
            fontSize: 16,
            opacity: 0.82,
            lineHeight: 22,
            color: "white",
          }}
        >
          {step.body}
        </Text>

        <View
          style={{
            marginTop: 28,
            height: 260,
            borderRadius: 20,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
          }}
        />
      </View>

      <View style={{ gap: 12, marginBottom: 18 }}>
        <Pressable
          disabled={busy}
          onPress={step.onPrimary}
          style={{
            height: 52,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "white",
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "black" }}>
              {step.primary}
            </Text>
          )}
        </Pressable>

        {step.secondary ? (
          <Pressable
            disabled={busy}
            onPress={step.onSecondary}
            style={{
              height: 52,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
              opacity: busy ? 0.7 : 1,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "white" }}>
              {step.secondary}
            </Text>
          </Pressable>
        ) : null}

        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}
        >
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: i === stepIndex ? 18 : 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.75)",
                opacity: i === stepIndex ? 1 : 0.35,
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
