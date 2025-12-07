// app/index.tsx
import { StyleSheet, Text, View } from "react-native";

export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DAYLOOP</Text>
      <Text style={styles.subtitle}>Esqueleto limpio listo para Phase 1</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});
