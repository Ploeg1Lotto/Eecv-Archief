import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, font, radius, spacing, type } from "./theme";

export function Header({
  title,
  subtitle,
  right,
  onBack,
  testID,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View
      testID={testID}
      style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
    >
      <Pressable
        testID="header-back-button"
        hitSlop={12}
        onPress={onBack ?? (() => router.back())}
        style={styles.backBtn}
      >
        <Feather name="chevron-left" size={26} color={colors.onSurface} />
      </Pressable>
      <View style={styles.headerTitleWrap}>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.headerSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            testID={`segment-${opt.key}`}
            onPress={() => onChange(opt.key)}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
          >
            <Text
              style={[styles.segmentText, active && styles.segmentTextActive]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  icon = "chevron-right",
  leftIcon,
  onPress,
  onLongPress,
  reorderControls,
  testID,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Feather.glyphMap | null;
  leftIcon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  onLongPress?: () => void;
  reorderControls?: {
    onUp: () => void;
    onDown: () => void;
    canUp: boolean;
    canDown: boolean;
  } | null;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={reorderControls ? undefined : onPress}
      onLongPress={reorderControls ? undefined : onLongPress}
      delayLongPress={300}
      style={({ pressed }) => [styles.row, !reorderControls && pressed && styles.rowPressed]}
    >
      {leftIcon ? (
        <View style={styles.rowLeftIcon}>
          <Feather name={leftIcon} size={20} color={colors.brand} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {reorderControls ? (
        <View style={styles.reorderWrap}>
          <Pressable
            testID={testID ? `${testID}-up` : undefined}
            disabled={!reorderControls.canUp}
            onPress={reorderControls.onUp}
            hitSlop={8}
            style={styles.reorderBtn}
          >
            <Feather
              name="chevron-up"
              size={24}
              color={reorderControls.canUp ? colors.brand : colors.border}
            />
          </Pressable>
          <Pressable
            testID={testID ? `${testID}-down` : undefined}
            disabled={!reorderControls.canDown}
            onPress={reorderControls.onDown}
            hitSlop={8}
            style={styles.reorderBtn}
          >
            <Feather
              name="chevron-down"
              size={24}
              color={reorderControls.canDown ? colors.brand : colors.border}
            />
          </Pressable>
        </View>
      ) : icon ? (
        <Feather name={icon} size={20} color={colors.onSurfaceTertiary} />
      ) : null}
    </Pressable>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  subtitle,
  testID,
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  testID?: string;
}) {
  return (
    <View testID={testID} style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Feather name={icon} size={30} color={colors.onSurfaceTertiary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Fab({
  onPress,
  label,
  testID,
}: {
  onPress: () => void;
  label: string;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { bottom: insets.bottom + spacing.lg },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Feather name="plus" size={20} color={colors.onBrandPrimary} />
      <Text style={styles.fabText}>{label}</Text>
    </Pressable>
  );
}

export function Badge({
  label,
  bg,
  fg,
}: {
  label: string;
  bg: string;
  fg: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryBtn,
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.9 },
        style,
      ]}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: { flex: 1 },
  headerTitle: {
    fontFamily: font.bold,
    fontSize: type.xl,
    color: colors.onSurface,
  },
  headerSubtitle: {
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.onSurfaceTertiary,
    marginTop: 1,
  },
  headerRight: { minWidth: 34, alignItems: "flex-end" },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: 3,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  segmentItem: {
    flex: 1,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm + 2,
  },
  segmentItemActive: {
    backgroundColor: colors.surface,
    ...{
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
  },
  segmentText: {
    fontFamily: font.semibold,
    fontSize: type.base,
    color: colors.onSurfaceTertiary,
  },
  segmentTextActive: { color: colors.onSurface },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowPressed: { backgroundColor: colors.surfaceSecondary },
  reorderWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reorderBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLeftIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontFamily: font.semibold,
    fontSize: type.lg,
    color: colors.onSurface,
  },
  rowSubtitle: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: font.semibold,
    fontSize: type.lg,
    color: colors.onSurface,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    height: 52,
    borderRadius: radius.pill,
    shadowColor: colors.brand,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabText: {
    fontFamily: font.bold,
    fontSize: type.base,
    color: colors.onBrandPrimary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  badgeText: { fontFamily: font.semibold, fontSize: type.sm },
  primaryBtn: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontFamily: font.bold,
    fontSize: type.lg,
    color: colors.onBrandPrimary,
  },
});
