// app/(tabs)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#8B5CF6",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          height: 72,
          paddingBottom: 8,
          paddingTop: 8,
          paddingHorizontal: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
        },
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
