// app/_layout.tsx
import { initNotificationsConfig } from "@/core/notifications/notifications";
import { initDatabase } from "@/data/sqlite/database";
import * as NavigationBar from "expo-navigation-bar";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAppFonts } from "@/theme/fonts";

const TAB_BAR_BG = "#ffffff";

export default function RootLayout() {
  initDatabase();

  useEffect(() => {
    if (Platform.OS === "android") {
      // Color de fondo de DAYLOOP
      NavigationBar.setBackgroundColorAsync(TAB_BAR_BG);
      // Íconos claros para que se vean bien
      NavigationBar.setButtonStyleAsync("dark");
    }
  }, []);

  useEffect(() => {
    initNotificationsConfig();
  }, []);

  const fontsLoaded = useAppFonts();

  if (!fontsLoaded) return null; // o splash
  
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Grupo principal de tabs */}
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />

          {/* MODAL: Crear hábito */}
          <Stack.Screen
            name="habit-new"
            options={{
              presentation: "transparentModal",
              contentStyle: {
                backgroundColor: "transparent", // clave
              },
            }}
          />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
