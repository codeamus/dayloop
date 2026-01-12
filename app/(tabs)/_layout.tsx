// app/(tabs)/_layout.tsx
import { colors } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const isHabitNewOpen = pathname === "/habit-new";

  const BASE_HEIGHT = 58; // tu altura actual
  const TOP_PADDING = 8; // tu paddingTop actual
  const EXTRA_AIR = 8; // 👈 valor seguro

  const bottom = insets.bottom + EXTRA_AIR;

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

            // ✅ la clave
            height: BASE_HEIGHT + bottom,
            paddingBottom: bottom,
            paddingTop: TOP_PADDING,
          },
          isHabitNewOpen && { display: "none" },
        ],
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
        },
        tabBarItemStyle: { paddingVertical: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="habits"
        options={{
          title: "Mis hábitos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="stats"
        options={{
          title: "Estadísticas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />

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
