// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_BG = "#ffffff";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const extraBottom =
    Platform.OS === "android" ? insets.bottom || 8 : insets.bottom;

  const isHabitModalOpen = pathname === "/habit-new";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#8B5CF6",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          paddingHorizontal: 12,
          height: 56 + extraBottom,
          paddingBottom: extraBottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: [
          {
            fontSize: 10,
            backgroundColor: TAB_BAR_BG,
            borderTopColor: "#e5e7eb",
            height: 56 + extraBottom,
            paddingBottom: extraBottom,
            paddingTop: 6,
          },
          isHabitModalOpen && { display: "none" },
        ],
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="index" // app/(tabs)/index.tsx
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* MY HABITS */}
      <Tabs.Screen
        name="habits" // app/(tabs)/habits/index.tsx
        options={{
          title: "Mis Habitos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" size={size} color={color} />
          ),
        }}
      />

      {/* MY STATS */}
      <Tabs.Screen
        name="stats" // app/(tabs)/stats/index.tsx
        options={{
          title: "Mis Estadísticas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ACCOUNT / SETTINGS */}
      <Tabs.Screen
        name="settings" // app/(tabs)/settings/index.tsx
        options={{
          title: "Mi Cuenta",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
