import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, Node } from "@/src/api";
import { DEFAULT_BANNERS } from "@/src/banners";
import { Header, PrimaryButton } from "@/src/components";
import { ConfirmSheet } from "@/src/modals";
import { ShareAppSection } from "@/src/share-app";
import { usePhotoCapture } from "@/src/use-photo-capture";
import { colors, font, radius, spacing, type } from "@/src/theme";

type BannerMap = Record<string, { data: string | null; hidden: boolean }>;

function formatDT(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Instellingen() {
  const insets = useSafeAreaInsets();
  const photo = usePhotoCapture();
  const [busy, setBusy] = useState<null | "export" | "import" | "wipe">(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [includeVideos, setIncludeVideos] = useState(false);
  const [confirmBanner, setConfirmBanner] = useState<Node | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [roots, setRoots] = useState<Node[]>([]);
  const [banners, setBanners] = useState<BannerMap>({});

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const tree = await api.getTree();
        const rs = tree.filter((n) => n.parent_id === null && !n.is_plattegrond);
        const entries = await Promise.all(
          rs.map(async (n) => [n.id, await api.getBanner(n.id)] as const),
        );
        if (!active) return;
        setRoots(rs);
        setBanners(Object.fromEntries(entries));
        setLastBackup(await api.getLastBackup());
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const changeBanner = (node: Node) => {
    photo.trigger(async (img) => {
      await api.setBanner(node.id, img);
      const dataUri = img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`;
      setBanners((b) => ({ ...b, [node.id]: { data: dataUri, hidden: false } }));
    });
  };

  const removeBanner = async () => {
    if (!confirmBanner) return;
    await api.deleteBanner(confirmBanner.id);
    setBanners((b) => ({ ...b, [confirmBanner.id]: { data: null, hidden: true } }));
    setConfirmBanner(null);
  };

  const doExport = async () => {
    setBusy("export");
    try {
      const ok = await api.exportData(includeVideos);
      if (ok) setLastBackup(await api.getLastBackup());
      else Alert.alert("Delen niet beschikbaar", "Kon het back-upbestand niet delen op dit toestel.");
    } catch {
      Alert.alert("Fout", "Het exporteren is mislukt. Probeer het opnieuw.");
    } finally {
      setBusy(null);
    }
  };

  const doImport = async () => {
    setConfirmImport(false);
    setBusy("import");
    try {
      const result = await api.importData();
      if (result) {
        Alert.alert("Back-up teruggezet", `${result.memos} memo's en ${result.photos} foto's hersteld.`);
      }
    } catch {
      Alert.alert("Fout", "Dit lijkt geen geldig back-upbestand te zijn.");
    } finally {
      setBusy(null);
    }
  };

  const doWipe = async () => {
    setConfirmWipe(false);
    setBusy("wipe");
    try {
      await api.clearAllData();
      Alert.alert("Alles gewist", "Alle memo's en foto's zijn verwijderd.");
    } catch {
      Alert.alert("Fout", "Het wissen is mislukt. Probeer het opnieuw.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Instellingen" subtitle="Beheer & back-up" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
        <Image
          testID="a0-header"
          source={require("@/assets/images/a0-header.jpg")}
          style={styles.a0Header}
          contentFit="contain"
          transition={200}
        />
        <View style={styles.body}>
        {/* Banners */}
        <Text style={styles.blockLabel}>VOORBLADFOTO&apos;S</Text>
        <Text style={styles.desc}>Beheer de foto die bovenaan elke pagina staat.</Text>
        <View style={styles.card}>
          {roots.map((n, i) => {
            const b = banners[n.id];
            const custom = b?.data ?? null;
            const showDefault = !b?.hidden && !custom && !!DEFAULT_BANNERS[n.id];
            const source = custom
              ? { uri: custom }
              : showDefault
                ? DEFAULT_BANNERS[n.id]
                : null;
            const hasImage = source != null;
            return (
              <View key={n.id} style={[styles.bannerRow, i > 0 && styles.rowDivider]}>
                {hasImage ? (
                  <Image source={source} style={styles.bannerThumb} contentFit="cover" />
                ) : (
                  <View style={[styles.bannerThumb, styles.bannerThumbEmpty]}>
                    <Feather name="image" size={18} color={colors.onSurfaceTertiary} />
                  </View>
                )}
                <Text style={styles.bannerName} numberOfLines={1}>
                  {n.name}
                </Text>
                <View style={styles.bannerActions}>
                  <Pressable
                    testID={`banner-change-${n.id}`}
                    onPress={() => changeBanner(n)}
                    hitSlop={8}
                    style={styles.iconBtn}
                  >
                    <Feather name={hasImage ? "edit-2" : "plus"} size={18} color={colors.brand} />
                  </Pressable>
                  {hasImage ? (
                    <Pressable
                      testID={`banner-delete-${n.id}`}
                      onPress={() => setConfirmBanner(n)}
                      hitSlop={8}
                      style={styles.iconBtn}
                    >
                      <Feather name="trash-2" size={18} color={colors.error} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.mt}>
          <ShareAppSection />
        </View>

        {/* Backup */}
        <Text style={[styles.blockLabel, styles.mt]}>BACK-UP</Text>
        <Text style={styles.desc}>
          Zet je gegevens in één bestand (delen/opslaan) of zet een eerdere back-up terug.
        </Text>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Video&apos;s meenemen</Text>
            <Text style={styles.toggleSub}>Groter back-upbestand. Standaard uit.</Text>
          </View>
          <Switch
            testID="include-videos-switch"
            value={includeVideos}
            onValueChange={setIncludeVideos}
            trackColor={{ false: colors.border, true: colors.brand }}
            thumbColor="#FFFFFF"
          />
        </View>
        <PrimaryButton
          testID="export-button"
          label={busy === "export" ? "Bezig…" : "Exporteren"}
          onPress={doExport}
          disabled={busy !== null}
        />
        <View style={styles.lastBackupRow}>
          <Feather name="clock" size={13} color={colors.onSurfaceTertiary} />
          <Text style={styles.lastBackupText} testID="last-backup-text">
            {lastBackup ? `Laatste back-up: ${formatDT(lastBackup)}` : "Nog geen back-up gemaakt"}
          </Text>
        </View>
        <PrimaryButton
          testID="import-button"
          label={busy === "import" ? "Bezig…" : "Importeren"}
          onPress={() => setConfirmImport(true)}
          disabled={busy !== null}
          style={[styles.mtSm, styles.btnSecondary]}
        />

        {/* Danger zone */}
        <Text style={[styles.blockLabel, styles.mt]}>ALLES WISSEN</Text>
        <View style={styles.warnBox}>
          <Feather name="alert-triangle" size={16} color="#991B1B" />
          <Text style={styles.warnText}>
            Verwijdert álle memo&apos;s en foto&apos;s (inclusief teksten) van dit toestel. Dit kan
            niet ongedaan worden gemaakt.
          </Text>
        </View>
        <PrimaryButton
          testID="wipe-button"
          label={busy === "wipe" ? "Bezig…" : "Verwijder alle memo's en foto's"}
          onPress={() => setConfirmWipe(true)}
          disabled={busy !== null}
          style={styles.btnDanger}
        />

        {busy ? (
          <View style={styles.busyRow}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : null}
        </View>
      </ScrollView>

      <ConfirmSheet
        visible={confirmImport}
        title="Back-up terugzetten?"
        message="De huidige gegevens op dit toestel worden vervangen door de inhoud van het back-upbestand."
        confirmLabel="Terugzetten"
        onConfirm={doImport}
        onClose={() => setConfirmImport(false)}
      />
      <ConfirmSheet
        visible={confirmWipe}
        title="Alles verwijderen?"
        message="Alle memo's en foto's (inclusief teksten) worden permanent verwijderd. Maak eventueel eerst een back-up."
        confirmLabel="Verwijderen"
        onConfirm={doWipe}
        onClose={() => setConfirmWipe(false)}
      />
      <ConfirmSheet
        visible={!!confirmBanner}
        title="Voorbladfoto verwijderen?"
        message={`De foto bovenaan "${confirmBanner?.name ?? ""}" wordt verwijderd.`}
        confirmLabel="Verwijderen"
        onConfirm={removeBanner}
        onClose={() => setConfirmBanner(null)}
      />
      {photo.element}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  a0Header: { width: "100%", aspectRatio: 504 / 654, backgroundColor: colors.surfaceSecondary },
  body: { padding: spacing.lg },
  blockLabel: {
    fontFamily: font.bold,
    fontSize: type.sm,
    letterSpacing: 1.2,
    color: colors.onSurfaceTertiary,
    marginBottom: spacing.xs,
  },
  mt: { marginTop: spacing.xl },
  mtSm: { marginTop: spacing.sm },
  desc: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.onSurfaceSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  bannerRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  bannerThumb: { width: 52, height: 40, borderRadius: radius.sm, backgroundColor: colors.border },
  bannerThumbEmpty: { alignItems: "center", justifyContent: "center" },
  bannerName: {
    flex: 1,
    marginLeft: spacing.md,
    fontFamily: font.semibold,
    fontSize: type.lg,
    color: colors.onSurface,
  },
  bannerActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  lastBackupRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  lastBackupText: { fontFamily: font.medium, fontSize: type.sm, color: colors.onSurfaceTertiary },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  toggleTitle: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onSurface },
  toggleSub: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },
  btnSecondary: { backgroundColor: colors.onSurfaceSecondary },
  btnDanger: { backgroundColor: colors.error },
  warnBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#FEF2F2",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  warnText: { flex: 1, fontFamily: font.medium, fontSize: type.sm, color: "#991B1B" },
  busyRow: { paddingVertical: spacing.xl },
});
