// app/(tabs)/_layout.tsx
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { router, Tabs, usePathname } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "rgba(241,233,215,0.65)",

        tabBarStyle: [
          {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: 12,
            height: 58 + extraBottom,
            paddingBottom: extraBottom,
            paddingTop: 8,
          },
          isHabitModalOpen && { display: "none" },
        ],

        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
        },

        // Esto ayuda a que no se vea “cuadrado” el tab bar en iOS
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* MY HABITS */}

      <Tabs.Screen
        name="habits"
        options={{
          title: "Mis hábitos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault(); // ✅ evitamos el comportamiento default
            router.replace("/habits"); // ✅ siempre lista
          },
        }}
      />

      {/* MY STATS */}
      <Tabs.Screen
        name="stats"
        options={{
          title: "Estadísticas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ACCOUNT / SETTINGS */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Cuenta",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
