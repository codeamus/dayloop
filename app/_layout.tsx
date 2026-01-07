// app/_layout.tsx
import { initNotificationsConfig } from "@/core/notifications/notifications";
import { initDatabase } from "@/data/sqlite/database";
import * as NavigationBar from "expo-navigation-bar";
import {
  Stack,
  useRootNavigationState,
  useRouter,
  useSegments,
} from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ToastProvider } from "@/presentation/components/ToastProvider";
import { useOnboardingGate } from "@/presentation/hooks/useOnboardingGate";
import { colors } from "@/theme/colors";
import { useAppFonts } from "@/theme/fonts";

// Android navigation bar (abajo)
const ANDROID_NAV_BG = colors.bg;
const ANDROID_NAV_STYLE: "light" | "dark" = "light"; // light => icons blancos

function AppBootLoader() {
  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator />
        </View>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  // Si initDatabase ya es idempotente, ok aquí.
  initDatabase();

  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();

  const { loading: onboardingLoading, hasSeen } = useOnboardingGate();
  const fontsLoaded = useAppFonts();

  // ruta actual
  const inOnboarding = useMemo(() => segments[0] === "onboarding", [segments]);

  // ruta deseada según estado
  const desiredPath = hasSeen ? "/" : "/onboarding";

  // estamos “mal parados” si:
  const isMismatch = useMemo(() => {
    // si ya vio onboarding, NO debería estar en /onboarding
    if (hasSeen && inOnboarding) return true;
    // si no lo ha visto, debería estar en /onboarding
    if (!hasSeen && !inOnboarding) return true;
    return false;
  }, [hasSeen, inOnboarding]);

  // Guard para no hacer replace infinito
  const lastNavRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync(ANDROID_NAV_BG);
      NavigationBar.setButtonStyleAsync(ANDROID_NAV_STYLE);
    }
  }, []);

  useEffect(() => {
    initNotificationsConfig();
  }, []);

  useEffect(() => {
    // Espera a que el router esté listo y a que tengamos el flag
    if (!navState?.key) return;
    if (onboardingLoading) return;

    if (!isMismatch) {
      // Estamos bien: resetea guard
      lastNavRef.current = null;
      return;
    }

    // Si ya intentamos navegar a este destino, no lo repitas
    if (lastNavRef.current === desiredPath) return;

    lastNavRef.current = desiredPath;
    router.replace(desiredPath);
  }, [navState?.key, onboardingLoading, isMismatch, desiredPath, router]);

  // Loader mientras:
  // - cargan fuentes
  // - leemos flag onboarding
  // - router no está listo
  // - o estamos en mismatch (evita ver flash y evita loops)
  if (!fontsLoaded || onboardingLoading || !navState?.key || isMismatch) {
    return <AppBootLoader />;
  }

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
        <ToastProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            {/* Onboarding: ruta real */}
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />

            {/* Tabs */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

            {/* MODAL: Crear hábito */}
            <Stack.Screen
              name="habit-new"
              options={{
                presentation: "transparentModal",
                animation: "fade",
                contentStyle: { backgroundColor: "transparent" },
              }}
            />
          </Stack>
        </ToastProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
