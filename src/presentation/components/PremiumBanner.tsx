// src/presentation/components/PremiumBanner.tsx
import { colors } from "@/theme/colors";
import { Feather } from "@expo/vector-icons";
import { useCallback } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PremiumBannerProps = {
  visible: boolean;
  onDismiss: () => void;
};

/**
 * Modal de celebración y upsell premium que aparece cuando el usuario
 * alcanza una racha de 3 días por primera vez.
 *
 * Diseño minimalista con gradiente sutil y color amarillo de la marca.
 * No bloquea el flujo: fácil de cerrar y seguir usando la app gratis.
 */
export function PremiumBanner({ visible, onDismiss }: PremiumBannerProps) {
  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleDismiss} />
        <View style={styles.container}>
          {/* Header con gradiente sutil */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.iconEmoji}>🎉</Text>
            </View>
            <Text style={styles.title}>¡3 días seguidos!</Text>
            <Text style={styles.subtitle}>
              Estás creando un cambio real.
            </Text>
          </View>

          {/* Contenido */}
          <View style={styles.content}>
            <Text style={styles.valueProp}>
              Desbloquea estadísticas avanzadas y temas personalizados con{" "}
              <Text style={styles.premiumText}>Dayloop Premium</Text>.
            </Text>

            {/* Botones */}
            <View style={styles.actions}>
              <Pressable
                style={styles.primaryButton}
                onPress={handleDismiss}
                hitSlop={8}
              >
                <Text style={styles.primaryButtonText}>
                  Conocer más
                </Text>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={handleDismiss}
                hitSlop={8}
              >
                <Text style={styles.secondaryButtonText}>Ahora no</Text>
              </Pressable>
            </View>
          </View>

          {/* Botón de cerrar */}
          <Pressable
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={8}
          >
            <Feather name="x" size={20} color={colors.mutedText} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    position: "relative",
  },
  header: {
    paddingTop: 32,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: "rgba(230,188,1,0.08)",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(230,188,1,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(230,188,1,0.25)",
  },
  iconEmoji: {
    fontSize: 32,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    color: colors.mutedText,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  content: {
    padding: 24,
  },
  valueProp: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 24,
  },
  premiumText: {
    color: colors.primary,
    fontWeight: "900",
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colors.primaryText,
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(50,73,86,0.40)",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
