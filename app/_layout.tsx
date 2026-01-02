// app/_layout.tsx
import { initNotificationsConfig } from "@/core/notifications/notifications";
import { initDatabase } from "@/data/sqlite/database";
import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "@/theme/colors";
import { useAppFonts } from "@/theme/fonts";


// Android navigation bar (abajo)
const ANDROID_NAV_BG = colors.bg;
const ANDROID_NAV_STYLE: "light" | "dark" = "light"; // light => icons blancos

export default function RootLayout() {
  // Nota: si initDatabase ya es idempotente, ok aquí.
  // Si no, muévelo a useEffect(() => initDatabase(), [])
  initDatabase();

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setBackgroundColorAsync(ANDROID_NAV_BG);
      NavigationBar.setButtonStyleAsync(ANDROID_NAV_STYLE);
    }
  }, []);

  useEffect(() => {
    initNotificationsConfig();
  }, []);

  const fontsLoaded = useAppFonts();
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Stack
          screenOptions={{
            headerShown: false,
            // ✅ Fondo global consistente con la paleta
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          {/* Grupo principal de tabs */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* MODAL: Crear hábito */}
          <Stack.Screen
            name="habit-new"
            options={{
              presentation: "transparentModal",
              contentStyle: {
                backgroundColor: "transparent",
              },
            }}
          />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
