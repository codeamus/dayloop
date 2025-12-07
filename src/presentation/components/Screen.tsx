import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  children: ReactNode;
  withPadding?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, withPadding = true, style }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View
        style={[styles.container, withPadding && styles.withPadding, style]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#020617", // fondo global de DAYLOOP
  },
  container: {
    flex: 1,
  },
  withPadding: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});
