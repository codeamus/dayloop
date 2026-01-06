// src/presentation/components/ToastProvider.tsx
import { colors } from "@/theme/colors";
import React, {
     createContext,
     useCallback,
     useContext,
     useMemo,
     useRef,
     useState,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

type ToastType = "info" | "success" | "error";

type ToastState = {
  visible: boolean;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  show: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider />");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "info",
  });

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 8,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast((t) => ({ ...t, visible: false, message: "" }));
    });
  }, [opacity, translateY]);

  const show = useCallback(
    (message: string, type: ToastType = "info") => {
      if (timerRef.current) clearTimeout(timerRef.current);

      setToast({ visible: true, message, type });

      opacity.setValue(0);
      translateY.setValue(8);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(hide, 1600);
    },
    [hide, opacity, translateY]
  );

  const value = useMemo(() => ({ show }), [show]);

const pillStyle =
  toast.type === "success"
    ? {
        borderColor: colors.success,
        backgroundColor: "rgba(142,205,110,0.18)", // success suave
      }
    : toast.type === "error"
    ? {
        borderColor: colors.danger,
        backgroundColor: "rgba(239,68,68,0.14)", // danger suave
      }
    : {
        borderColor: colors.primary,
        backgroundColor: colors.text, // 🔥 mismo que cards
      };


  return (
    <ToastContext.Provider value={value}>
      {children}

      {toast.visible ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.container, { opacity, transform: [{ translateY }] }]}
        >
          <View style={[styles.pill, pillStyle]}>
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    alignItems: "center",
  },
  pill: {
    maxWidth: 520,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    color: colors.surfaceAlt,
    fontWeight: "900",
    textAlign: "center",
  },
});
