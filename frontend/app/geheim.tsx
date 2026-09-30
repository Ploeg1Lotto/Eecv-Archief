import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, font, radius, spacing, type } from "@/src/theme";

const IMG_W = 504;
const IMG_H = 654;

export default function Geheim() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [box, setBox] = useState({ w: 0, h: 0 });

  const scale = box.w > 0 ? Math.min(box.w / IMG_W, (box.h - 56) / IMG_H) : 0;

  return (
    <View style={styles.container}>
      <View
        style={styles.imageArea}
        onLayout={(e) =>
          setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
        }
      >
        {scale > 0 ? (
          <Image
            testID="geheim-image"
            source={require("@/assets/images/secret.jpg")}
            style={{ width: IMG_W * scale, height: IMG_H * scale, borderRadius: radius.md }}
            resizeMode="contain"
          />
        ) : null}
        {scale > 0 ? <Text style={styles.ripText}>RIP 2021</Text> : null}
      </View>

      <View style={[styles.backWrap, { top: insets.top + spacing.sm }]}>
        <Pressable testID="geheim-back" onPress={() => router.back()} hitSlop={8} style={styles.glassBtn}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={40} tint="light" style={styles.glassFill}>
              <Feather name="chevron-left" size={22} color={colors.onSurface} />
            </BlurView>
          ) : (
            <View style={[styles.glassFill, styles.glassSolid]}>
              <Feather name="chevron-left" size={22} color={colors.onSurface} />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceInverse },
  imageArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  backWrap: { position: "absolute", left: spacing.lg },
  ripText: {
    fontFamily: font.bold,
    fontSize: type.xl,
    color: colors.onSurfaceInverse,
    letterSpacing: 2,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  glassBtn: { borderRadius: radius.pill, overflow: "hidden" },
  glassFill: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  glassSolid: { backgroundColor: "rgba(255,255,255,0.9)" },
});
