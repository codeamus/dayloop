import { colors } from "@/theme/colors";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

type Props = {
  variant: "ok" | "pending";
  text: string;
};

export function StatusPill({ variant, text }: Props) {
  const isOk = variant === "ok";

  return (
    <View style={[styles.pill, isOk ? styles.ok : styles.pending]}>
      {isOk ? <OkIcon /> : <PendingIcon />}
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

function OkIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Circle
        cx="12"
        cy="12"
        r="9"
        stroke={colors.success}
        strokeWidth="2"
        fill="none"
      />
      <Path
        d="M8 12.5l2.4 2.4L16.5 9"
        stroke={colors.success}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PendingIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Circle
        cx="12"
        cy="12"
        r="9"
        stroke={colors.mutedText}
        strokeWidth="2"
        fill="none"
      />
      <Path
        d="M12 7v6l4 2"
        stroke={colors.mutedText}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  ok: {
    backgroundColor: "rgba(142,205,110,0.10)",
    borderColor: "rgba(142,205,110,0.25)",
  },
  pending: {
    backgroundColor: "rgba(241,233,215,0.06)",
    borderColor: "rgba(241,233,215,0.14)",
  },
  text: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
  },
});
