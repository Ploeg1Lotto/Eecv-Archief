import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, font, radius, spacing, type } from "@/src/theme";

const PLATTEGRONDEN = [
  {
    key: "zeekade",
    label: "Erts",
    source: require("@/assets/images/plattegrond-zeekade.jpg"),
    imgW: 1280,
    imgH: 927,
  },
  {
    key: "kbanden",
    label: "Kolen",
    source: require("@/assets/images/plattegrond-kbanden.jpg"),
    imgW: 1280,
    imgH: 874,
  },
];

// Klikbare zones per plattegrond. Coördinaten zijn fracties (0..1) van de
// afbeelding (breedte x hoogte). id = node-id waar naartoe genavigeerd wordt.
type Hotspot = { id: string; x: number; y: number; w: number; h: number };

const HOTSPOTS: Record<string, Hotspot[]> = {
  zeekade: [
    // A-rij (Zeekade)
    { id: "zeekade-a3", x: 0.315, y: 0.055, w: 0.05, h: 0.05 },
    { id: "zeekade-a2", x: 0.38, y: 0.055, w: 0.05, h: 0.05 },
    { id: "zeekade-a4", x: 0.448, y: 0.055, w: 0.05, h: 0.05 },
    { id: "zeekade-a1", x: 0.514, y: 0.055, w: 0.05, h: 0.05 },
    { id: "/instellingen", x: 0.58, y: 0.055, w: 0.05, h: 0.05 },
    // C-banden links + WC rechtsboven
    { id: "zeekade-c11-en-wc12", x: 0.03, y: 0.13, w: 0.1, h: 0.05 },
    { id: "zeekade-c21-en-wc22", x: 0.03, y: 0.185, w: 0.1, h: 0.05 },
    { id: "zeekade-c11-en-wc12", x: 0.74, y: 0.05, w: 0.08, h: 0.045 },
    { id: "zeekade-c21-en-wc22", x: 0.805, y: 0.05, w: 0.08, h: 0.045 },
    // G-banden links
    { id: "middenveld-g-banden-g11", x: 0.085, y: 0.265, w: 0.09, h: 0.06 },
    { id: "middenveld-g-banden-g12", x: 0.085, y: 0.39, w: 0.09, h: 0.06 },
    { id: "middenveld-g-banden-g13", x: 0.085, y: 0.505, w: 0.09, h: 0.06 },
    { id: "middenveld-g-banden-g14", x: 0.085, y: 0.625, w: 0.09, h: 0.06 },
    // L-loopwagens
    { id: "middenveld-l1", x: 0.18, y: 0.27, w: 0.075, h: 0.065 },
    { id: "middenveld-l2", x: 0.29, y: 0.39, w: 0.075, h: 0.065 },
    { id: "middenveld-l3", x: 0.42, y: 0.505, w: 0.075, h: 0.065 },
    { id: "middenveld-l4", x: 0.625, y: 0.625, w: 0.075, h: 0.065 },
    // D-banden
    { id: "d-banden-d40", x: 0.75, y: 0.325, w: 0.075, h: 0.05 },
    { id: "d-banden-d10", x: 0.785, y: 0.455, w: 0.075, h: 0.05 },
    { id: "d-banden-d20", x: 0.82, y: 0.575, w: 0.075, h: 0.05 },
    { id: "d-banden-d30", x: 0.855, y: 0.695, w: 0.075, h: 0.05 },
    // Binnenkade B / H
    { id: "binnenkade-wh31-en-h32", x: 0.1, y: 0.765, w: 0.09, h: 0.05 },
    { id: "binnenkade-b3", x: 0.24, y: 0.765, w: 0.08, h: 0.055 },
    { id: "binnenkade-wh21-en-h22", x: 0.42, y: 0.805, w: 0.09, h: 0.05 },
    { id: "binnenkade-b2", x: 0.545, y: 0.805, w: 0.08, h: 0.055 },
    { id: "binnenkade-wh21-en-h22", x: 0.78, y: 0.915, w: 0.1, h: 0.05 },
    { id: "binnenkade-wh31-en-h32", x: 0.86, y: 0.915, w: 0.1, h: 0.05 },
  ],
  kbanden: [
    // A-rij
    { id: "zeekade-a3", x: 0.383, y: 0.02, w: 0.055, h: 0.055 },
    { id: "zeekade-a2", x: 0.453, y: 0.02, w: 0.055, h: 0.055 },
    { id: "zeekade-a4", x: 0.52, y: 0.02, w: 0.055, h: 0.055 },
    { id: "zeekade-a1", x: 0.586, y: 0.02, w: 0.055, h: 0.055 },
    { id: "/instellingen", x: 0.652, y: 0.02, w: 0.055, h: 0.055 },
    // K-banden
    { id: "k-banden-k10", x: 0.19, y: 0.145, w: 0.1, h: 0.055 },
    { id: "k-banden-k11", x: 0.03, y: 0.29, w: 0.11, h: 0.055 },
    { id: "k-banden-k20", x: 0.13, y: 0.405, w: 0.09, h: 0.05 },
    { id: "k-banden-k50", x: 0.01, y: 0.535, w: 0.09, h: 0.05 },
    { id: "k-banden-k30", x: 0.215, y: 0.53, w: 0.09, h: 0.05 },
    { id: "k-banden-k40", x: 0.195, y: 0.59, w: 0.09, h: 0.05 },
    { id: "k-banden-k60", x: 0.21, y: 0.685, w: 0.09, h: 0.05 },
    { id: "k-banden-k70", x: 0.23, y: 0.825, w: 0.09, h: 0.05 },
    { id: "k-banden-k80", x: 0.005, y: 0.865, w: 0.09, h: 0.055 },
    { id: "k-banden-k90", x: 0.005, y: 0.63, w: 0.09, h: 0.055 },
    // Middenveld L5-L7 + G15-G17 (rechterzijde)
    { id: "middenveld-l5", x: 0.825, y: 0.555, w: 0.075, h: 0.06 },
    { id: "middenveld-l6", x: 0.655, y: 0.63, w: 0.075, h: 0.06 },
    { id: "middenveld-l7", x: 0.5, y: 0.9, w: 0.08, h: 0.06 },
    { id: "middenveld-g-banden-g15", x: 0.9, y: 0.55, w: 0.095, h: 0.05 },
    { id: "middenveld-g-banden-g16", x: 0.9, y: 0.63, w: 0.095, h: 0.05 },
    { id: "middenveld-g-banden-g17", x: 0.885, y: 0.9, w: 0.1, h: 0.05 },
    // TLS + Binnenkade
    { id: "binnenkade-wh41-en-h42", x: 0.03, y: 0.395, w: 0.1, h: 0.05 },
    { id: "tls-loc", x: 0.03, y: 0.72, w: 0.09, h: 0.05 },
    { id: "tls-w10", x: 0.52, y: 0.745, w: 0.11, h: 0.05 },
    { id: "tls-bediening", x: 0.865, y: 0.745, w: 0.12, h: 0.05 },
    { id: "binnenkade-b4", x: 0.485, y: 0.475, w: 0.09, h: 0.06 },
    { id: "binnenkade-wh41-en-h42", x: 0.74, y: 0.48, w: 0.09, h: 0.05 },
  ],
};

export default function Plattegrond() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [showHotspots, setShowHotspots] = useState(true);
  const [areaW, setAreaW] = useState(0);
  const current = PLATTEGRONDEN[index];
  const hotspots = HOTSPOTS[current.key] ?? [];

  return (
    <View style={styles.container}>
      <View
        style={styles.imageArea}
        onLayout={(e) => setAreaW(e.nativeEvent.layout.width)}
      >
        {areaW > 0 ? (
          <View style={{ width: areaW, height: (areaW * current.imgH) / current.imgW }}>
            <Image
              testID="plattegrond-image"
              source={current.source}
              style={{ width: areaW, height: (areaW * current.imgH) / current.imgW }}
              resizeMode="contain"
            />
            {hotspots.map((h, i) => (
              <Pressable
                key={`${h.id}-${i}`}
                testID={`hotspot-${h.id}`}
                onPress={() =>
                  router.push(h.id.startsWith("/") ? h.id : `/node/${h.id}`)
                }
                style={[
                  {
                    position: "absolute",
                    left: `${h.x * 100}%`,
                    top: `${h.y * 100}%`,
                    width: `${h.w * 100}%`,
                    height: `${h.h * 100}%`,
                  },
                  showHotspots ? styles.hotspotVisible : null,
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>

      {/* Back button */}
      <View style={[styles.backWrap, { top: insets.top + spacing.sm }]}>
        <GlassButton onPress={() => router.back()} icon="chevron-left" testID="plattegrond-back" />
      </View>

      {/* Toggle klikbare zones */}
      <View style={[styles.toggleWrap, { top: insets.top + spacing.sm + 52 }]}>
        <GlassButton
          onPress={() => setShowHotspots((v) => !v)}
          icon={showHotspots ? "eye" : "eye-off"}
          testID="plattegrond-toggle-hotspots"
        />
      </View>

      {/* Plattegrond switch */}
      <View style={[styles.switchWrap, { top: insets.top + spacing.sm }]}>
        <View style={styles.switch}>
          {PLATTEGRONDEN.map((p, i) => {
            const active = i === index;
            return (
              <Pressable
                key={p.key}
                testID={`plattegrond-tab-${p.key}`}
                onPress={() => setIndex(i)}
                style={[styles.switchItem, active && styles.switchItemActive]}
              >
                <Text style={[styles.switchText, active && styles.switchTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.hint, { bottom: insets.bottom + spacing.lg }]} pointerEvents="none">
        <Text style={styles.hintText}>Tik op een locatie om te openen</Text>
      </View>
    </View>
  );
}

function GlassButton({
  onPress,
  icon,
  testID,
}: {
  onPress: () => void;
  icon: keyof typeof Feather.glyphMap;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.glassBtn} hitSlop={8}>
      {Platform.OS === "ios" ? (
        <BlurView intensity={40} tint="light" style={styles.glassFill}>
          <Feather name={icon} size={22} color={colors.onSurface} />
        </BlurView>
      ) : (
        <View style={[styles.glassFill, styles.glassSolid]}>
          <Feather name={icon} size={22} color={colors.onSurface} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceInverse,
    alignItems: "center",
    justifyContent: "center",
  },
  imageArea: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center" },
  zoomContent: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  switchWrap: {
    position: "absolute",
    right: spacing.lg,
    left: spacing.lg + 52,
    alignItems: "flex-end",
  },
  switch: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: radius.pill,
    padding: 3,
  },
  switchItem: {
    paddingHorizontal: spacing.md,
    height: 38,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  switchItemActive: { backgroundColor: colors.brand },
  switchText: { fontFamily: font.semibold, fontSize: type.sm, color: "rgba(255,255,255,0.8)" },
  switchTextActive: { color: colors.onBrandPrimary },
  hint: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  hintText: { fontFamily: font.medium, fontSize: type.sm, color: "rgba(255,255,255,0.9)" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  dropzone: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  dropTitle: {
    fontFamily: font.bold,
    fontSize: type.xl,
    color: colors.onSurfaceInverse,
    marginTop: spacing.lg,
  },
  dropSubtitle: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: "rgba(255,255,255,0.7)",
    marginTop: spacing.xs,
  },
  backWrap: { position: "absolute", left: spacing.lg },
  toggleWrap: { position: "absolute", left: spacing.lg },
  hotspotVisible: {
    backgroundColor: "rgba(234,88,12,0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(234,88,12,0.85)",
    borderRadius: 4,
  },
  replaceWrap: { position: "absolute", right: spacing.lg },
  glassBtn: { borderRadius: radius.pill, overflow: "hidden" },
  glassFill: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  glassSolid: { backgroundColor: "rgba(255,255,255,0.9)" },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    gap: spacing.sm,
  },
  uploadingText: { fontFamily: font.medium, color: colors.onSurfaceInverse },
});
