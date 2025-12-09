// app/_layout.tsx
import { initNotificationsConfig } from "@/core/notifications/notifications";
import { initDatabase } from "@/data/sqlite/database";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";


export default function RootLayout() {
  initDatabase();

  useEffect(() => {
    initNotificationsConfig();
  }, []);
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
              presentation: "modal",
              animation: "slide_from_bottom",
              headerShown: false,
            }}
          />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
