// app/onboarding.tsx
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  Image as RNImage,
  ScrollView,
  Text,
  View,
} from "react-native";

import { setHasSeenOnboarding } from "@/core/settings/onboardingSettings";
import { colors } from "@/theme/colors";

const images = [
  require("assets/onboarding/step-1.png"),
  require("assets/onboarding/step-2.png"),
  require("assets/onboarding/step-3.png"),
];

type Step = {
  title: string;
  body: string;
  primary: string;
  secondary?: string;
  caption?: string;
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

  // ✅ Preload imágenes (mejora el "lag" al cambiar step)
  useEffect(() => {
    images.forEach((img) => {
      const uri = RNImage.resolveAssetSource(img)?.uri;
      if (uri) RNImage.prefetch(uri);
    });
  }, []);

  // Animación: fade + slide (solo texto, para que la imagen se sienta instantánea)
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const animateTo = (direction: "next" | "prev", cb: () => void) => {
    const outY = direction === "next" ? 10 : -10;

    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: outY,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(20),
    ]).start(() => {
      cb();
      translateY.setValue(-outY);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const finish = async () => {
    await setHasSeenOnboarding(true);
    router.replace("/");
  };

  const goNext = () => {
    if (stepIndex >= 2) return;
    animateTo("next", () => setStepIndex((v) => v + 1));
  };

  const steps: Step[] = useMemo(
    () => [
      {
        title: "Crea hábitos sin presión",
        body: "Dayloop te ayuda a construir hábitos diarios de forma simple y constante, sin complicarte.",
        caption: "Consejo: mantén un objetivo simple por semana.",
        primary: "Continuar",
        onPrimary: goNext,
      },
      {
        title: "Marca y sigue tu progreso",
        body: "Completa tus hábitos día a día y mira tu avance con estadísticas claras y rachas.",
        caption: "Pequeños pasos → progreso real.",
        primary: "Continuar",
        onPrimary: goNext,
      },
      {
        title: "Recordatorios que sí ayudan",
        body: "Activa notificaciones para recibir recordatorios en los horarios que tú elijas.",
        caption: "Tú controlas el horario.",
        primary: "Activar recordatorios",
        secondary: "Ahora no",
        onPrimary: async () => {
          if (busy) return;
          setBusy(true);
          await requestNotifPermissionSafe();
          await finish();
        },
        onSecondary: async () => {
          if (busy) return;
          setBusy(true);
          await finish();
        },
      },
    ],
    [busy, stepIndex]
  );

  const step = steps[stepIndex];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 64, paddingHorizontal: 20 }}>
        {/* Progress bar */}
        <View
          style={{
            marginTop: 10,
            height: 5,
            borderRadius: 999,
            backgroundColor: colors.border,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${((stepIndex + 1) / 3) * 100}%`,
              height: 5,
              borderRadius: 999,
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </View>

      {/* Content */}
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 14,
            paddingBottom: 14, // aire antes del footer fijo
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* ✅ Texto animado (la imagen NO se anima para que se sienta instantánea) */}
          <Animated.View
            style={{
              opacity,
              transform: [{ translateY }],
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 30,
                fontWeight: "800",
                lineHeight: 34,
                marginTop: 10,
              }}
            >
              {step.title}
            </Text>

            <Text
              style={{
                color: colors.mutedText,
                fontSize: 16,
                lineHeight: 22,
                marginTop: 10,
              }}
            >
              {step.body}
            </Text>
          </Animated.View>

          {/* ✅ Imagen SIN animación + fadeDuration 0 (Android) */}
          <View
            style={{
              marginTop: 22,
              borderRadius: 24,
              backgroundColor: colors.surface,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ height: 320, backgroundColor: colors.surfaceAlt }}>
              <Image
                source={images[stepIndex]}
                resizeMode="cover"
                fadeDuration={0} // ✅ elimina fade interno Android
                style={{ width: "100%", height: "100%" }}
              />

              {/* Overlay suave para integrar con dark theme */}
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 120,
                  backgroundColor: "rgba(43,62,74,0.45)",
                }}
              />

              {/* Caption sobre overlay */}
              <View
                style={{
                  position: "absolute",
                  left: 14,
                  right: 14,
                  bottom: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  backgroundColor: colors.surfaceOverlay,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 13,
                    fontWeight: "700",
                  }}
                >
                  {step.caption}
                </Text>
              </View>
            </View>
          </View>

          {/* Dots */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              marginTop: 14,
            }}
          >
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: i === stepIndex ? 18 : 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor:
                    i === stepIndex ? colors.primary : colors.divider,
                  opacity: i === stepIndex ? 1 : 0.6,
                }}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Footer buttons */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 18, gap: 12 }}>
        <Pressable
          disabled={busy}
          onPress={step.onPrimary}
          style={{
            height: 54,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator />
          ) : (
            <Text
              style={{
                color: colors.primaryText,
                fontSize: 16,
                fontWeight: "900",
              }}
            >
              {step.primary}
            </Text>
          )}
        </Pressable>

        {step.secondary ? (
          <Pressable
            disabled={busy}
            onPress={step.onSecondary}
            style={{
              height: 54,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "transparent",
              opacity: busy ? 0.7 : 1,
            }}
          >
            <Text
              style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}
            >
              {step.secondary}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={busy}
            onPress={finish}
            style={{
              height: 54,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: "transparent",
            }}
          >
            <Text
              style={{
                color: colors.mutedText,
                fontSize: 15,
                fontWeight: "800",
              }}
            >
              Omitir
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
