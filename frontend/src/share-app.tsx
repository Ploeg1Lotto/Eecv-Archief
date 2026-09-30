import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "./components";
import { colors, font, radius, spacing, type } from "./theme";

const TITLE = "Eecv Archief";
const MSG = "Open de Eecv Archief app via deze link:";

const STEPS = {
  apple: [
    "Open de link in Safari",
    "Tik onderin op het Deel-icoon (vierkant met pijl omhoog)",
    "Kies 'Zet op beginscherm' en tik op 'Voeg toe'",
  ],
  android: [
    "Open de link in Chrome",
    "Tik rechtsboven op het menu (drie puntjes)",
    "Kies 'App installeren' of 'Toevoegen aan startscherm'",
  ],
};

function Steps({ kind }: { kind: "apple" | "android" }) {
  return (
    <View style={s.card} testID={`install-steps-${kind}`}>
      <View style={s.cardHead}>
        <Feather name="smartphone" size={16} color={colors.brand} />
        <Text style={s.cardTitle}>{kind === "apple" ? "iPhone / iPad" : "Android"}</Text>
      </View>
      {STEPS[kind].map((t, i) => (
        <View key={t} style={s.step}>
          <Text style={s.stepNum}>{i + 1}</Text>
          <Text style={s.stepText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

export function ShareAppSection() {
  const [copied, setCopied] = useState(false);
  if (Platform.OS !== "web") return null;
  const url = window.location.origin;

  const share = async () => {
    const nav = navigator as any;
    if (nav.share) {
      try {
        await nav.share({ title: TITLE, text: MSG, url });
      } catch {
        /* cancelled */
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${MSG} ${url}`)}`, "_blank");
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Kopieer deze link:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const links = [
    { id: "whatsapp", icon: "message-circle", label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${MSG} ${url}`)}` },
    { id: "mail", icon: "mail", label: "Mail", href: `mailto:?subject=${encodeURIComponent(TITLE)}&body=${encodeURIComponent(`${MSG} ${url}`)}` },
  ] as const;

  return (
    <View testID="share-app-section">
      <Text style={s.label}>APP DELEN</Text>
      <Text style={s.desc}>Stuur de link naar collega&apos;s. Iedereen bewaart zijn eigen gegevens op zijn eigen toestel.</Text>
      <PrimaryButton testID="share-app-button" label="Deel de app" onPress={share} />
      <View style={s.row}>
        {links.map((l) => (
          <Pressable key={l.id} testID={`share-app-${l.id}`} style={s.chip} onPress={() => window.open(l.href, "_blank")}>
            <Feather name={l.icon} size={15} color={colors.brand} />
            <Text style={s.chipText}>{l.label}</Text>
          </Pressable>
        ))}
        <Pressable testID="share-app-copy" style={s.chip} onPress={copy}>
          <Feather name={copied ? "check" : "link"} size={15} color={colors.brand} />
          <Text style={s.chipText}>{copied ? "Gekopieerd" : "Kopieer link"}</Text>
        </Pressable>
      </View>
      <Text style={[s.label, { marginTop: spacing.xl }]}>INSTALLEREN OP JE TELEFOON</Text>
      <Text style={s.desc}>Zet de app op je beginscherm, dan opent hij als een gewone app.</Text>
      <Steps kind="apple" />
      <Steps kind="android" />
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: font.bold, fontSize: type.sm, letterSpacing: 1.2, color: colors.onSurfaceTertiary, marginBottom: spacing.xs },
  desc: { fontFamily: font.regular, fontSize: type.base, color: colors.onSurfaceSecondary, lineHeight: 20, marginBottom: spacing.md },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.surfaceSecondary,
  },
  chipText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.onSurface },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  cardTitle: { fontFamily: font.bold, fontSize: type.lg, color: colors.onSurface },
  step: { flexDirection: "row", gap: spacing.sm, paddingVertical: 3 },
  stepNum: { fontFamily: font.bold, fontSize: type.base, color: colors.brand, width: 16 },
  stepText: { flex: 1, fontFamily: font.regular, fontSize: type.base, color: colors.onSurfaceSecondary, lineHeight: 20 },
});
