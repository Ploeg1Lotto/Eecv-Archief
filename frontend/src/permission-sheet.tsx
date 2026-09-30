import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, font, radius, spacing, type } from "./theme";

export function PermissionSheet({
  visible,
  onClose,
  title,
  message,
  onOpenSettings,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  onOpenSettings: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="perm-backdrop">
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.icon}>
            <Feather name="lock" size={24} color={colors.brand} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable testID="perm-open-settings" style={styles.primary} onPress={onOpenSettings}>
            <Text style={styles.primaryText}>Open instellingen</Text>
          </Pressable>
          <Pressable testID="perm-cancel" style={styles.secondary} onPress={onClose}>
            <Text style={styles.secondaryText}>Annuleren</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function PhotoSourceSheet({
  visible,
  onClose,
  onChoose,
}: {
  visible: boolean;
  onClose: () => void;
  onChoose: (source: "camera" | "library") => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID="photo-source-backdrop">
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.title}>Foto toevoegen</Text>
          <Pressable testID="source-camera" style={styles.option} onPress={() => onChoose("camera")}>
            <View style={styles.optIcon}>
              <Feather name="camera" size={22} color={colors.brand} />
            </View>
            <Text style={styles.optText}>Camera</Text>
          </Pressable>
          <Pressable testID="source-library" style={styles.option} onPress={() => onChoose("library")}>
            <View style={styles.optIcon}>
              <Feather name="image" size={22} color={colors.brand} />
            </View>
            <Text style={styles.optText}>Bibliotheek</Text>
          </Pressable>
          <Pressable testID="source-cancel" style={styles.secondary} onPress={onClose}>
            <Text style={styles.secondaryText}>Annuleren</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: font.bold,
    fontSize: type.xl,
    color: colors.onSurface,
    textAlign: "center",
  },
  message: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  primary: {
    width: "100%",
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontFamily: font.bold, fontSize: type.lg, color: colors.onBrandPrimary },
  secondary: { marginTop: spacing.sm, height: 44, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceTertiary },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  optIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  optText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onSurface },
});
