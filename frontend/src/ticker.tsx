import { Feather } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, font, radius, spacing, type } from "@/src/theme";

export type TickerMemo = { id: string; node_id: string; text: string };

export function MemoTicker({
  memos,
  onPress,
}: {
  memos: TickerMemo[];
  onPress: (nodeId: string) => void;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    if (w <= 0) return;
    x.setValue(0);
    const duration = (w / 45) * 1000; // ~45px per second
    const anim = Animated.loop(
      Animated.timing(x, {
        toValue: -w,
        duration,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [w, x, memos.length]);

  if (memos.length === 0) return null;

  const renderSet = (
    prefix: string,
    onLayout?: (e: { nativeEvent: { layout: { width: number } } }) => void,
  ) => (
    <View style={styles.set} onLayout={onLayout}>
      {memos.map((m) => (
        <Pressable
          key={`${prefix}-${m.id}`}
          testID={`ticker-${prefix}-${m.id}`}
          onPress={() => onPress(m.node_id)}
          style={styles.item}
        >
          <View style={styles.dot} />
          <Text style={styles.itemText} numberOfLines={1}>
            {m.text}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Feather name="rss" size={12} color={colors.onBrandPrimary} />
        <Text style={styles.badgeText}>{"MEMO'S"}</Text>
      </View>
      <View style={styles.viewport}>
        <Animated.View style={[styles.track, { transform: [{ translateX: x }] }]}>
          {renderSet("a", (e) => setW(e.nativeEvent.layout.width))}
          {renderSet("b")}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: "100%",
    paddingHorizontal: spacing.md,
    backgroundColor: colors.brand,
  },
  badgeText: {
    fontFamily: font.bold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.onBrandPrimary,
  },
  viewport: { flex: 1, overflow: "hidden", justifyContent: "center" },
  track: { flexDirection: "row" },
  set: { flexDirection: "row", alignItems: "center" },
  item: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.brand,
    marginRight: spacing.sm,
  },
  itemText: {
    fontFamily: font.medium,
    fontSize: type.base,
    color: colors.onSurfaceSecondary,
  },
});
