import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ListRow } from "@/src/components";
import { api, Memo, Node } from "@/src/api";
import { ConfirmSheet, MovePickerModal, NameInputModal, NodeActionsSheet } from "@/src/modals";
import { MemoTicker } from "@/src/ticker";
import { colors, font, radius, spacing, type } from "@/src/theme";

function iconFor(node: Node): keyof typeof Feather.glyphMap {
  if (node.is_plattegrond) return "map";
  if (!node.has_children) return "file-text";
  return "folder";
}

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [roots, setRoots] = useState<Node[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [actionNode, setActionNode] = useState<Node | null>(null);
  const [renameTarget, setRenameTarget] = useState<Node | null>(null);
  const [moveTarget, setMoveTarget] = useState<Node | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Node | null>(null);

  const load = useCallback(async () => {
    try {
      setError(false);
      const tree = await api.getTree();
      setRoots(tree.filter((n) => n.parent_id === null).sort((a, b) => a.order - b.order));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMemos = useCallback(async () => {
    try {
      await api.migrateOnce();
      setMemos(await api.getRecentMemos(5));
    } catch {
      /* ticker is non-critical */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      loadMemos();
    }, [loadMemos]),
  );

  const open = (node: Node) => {
    if (node.is_plattegrond) router.push("/plattegrond");
    else router.push(`/node/${node.id}`);
  };

  const doAddPage = async (name: string, kind: "folder" | "page") => {
    await api.addNode(null, name, kind);
    await load();
  };
  const doRename = async (name: string) => {
    if (!renameTarget) return;
    await api.renameNode(renameTarget.id, name);
    setRenameTarget(null);
    await load();
  };
  const doDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteNode(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  };
  const move = async (id: string, direction: "up" | "down") => {
    await api.reorderNode(id, direction);
    await load();
  };
  const doMove = async (targetId: string | null) => {
    if (!moveTarget) return;
    await api.moveNode(moveTarget.id, targetId);
    setMoveTarget(null);
    await load();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        <View style={styles.hero}>
          <Image
            source={require("@/assets/images/home-hero.jpg")}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={["rgba(24,24,27,0.15)", "rgba(24,24,27,0.85)"]}
            style={StyleSheet.absoluteFill}
          />
          <Image
            source={require("@/assets/images/logo.png")}
            style={[styles.heroLogo, { top: insets.top + 36 }]}
            contentFit="contain"
          />
          <View style={[styles.heroContent, { paddingTop: insets.top + spacing.lg }]}>
            <Text style={styles.heroKicker}>Naslag</Text>
            <Text style={styles.heroTitle}>ERTSOVERSLAG Europoort CV</Text>
          </View>
        </View>

        <MemoTicker
          memos={memos.map((m) => ({ id: m.id, node_id: m.node_id, text: m.text }))}
          onPress={(id) => router.push(`/node/${id}`)}
        />

        <Pressable
          testID="search-bar"
          onPress={() => router.push("/search")}
          style={styles.searchBar}
        >
          <Feather name="search" size={18} color={colors.onSurfaceTertiary} />
          <Text style={styles.searchText}>Zoek locatie of inhoud…</Text>
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>ZONES</Text>
          <View style={styles.sectionActions}>
            <Pressable
              testID="reorder-toggle"
              onPress={() => setReordering((r) => !r)}
              style={styles.settingsBtn}
              hitSlop={8}
            >
              <Feather
                name={reordering ? "check" : "move"}
                size={16}
                color={reordering ? colors.brand : colors.onSurfaceTertiary}
              />
              <Text style={[styles.settingsText, reordering && { color: colors.brand }]}>
                {reordering ? "Klaar" : "Volgorde"}
              </Text>
            </Pressable>
            <Pressable
              testID="settings-button"
              onPress={() => router.push("/instellingen")}
              style={styles.settingsBtn}
              hitSlop={8}
            >
              <Feather name="settings" size={16} color={colors.onSurfaceTertiary} />
              <Text style={styles.settingsText}>Back-up</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : error ? (
          <Pressable onPress={load} style={styles.errorBox} testID="home-retry">
            <Feather name="alert-triangle" size={22} color={colors.error} />
            <Text style={styles.errorText}>
              Kon de indeling niet laden. Tik om opnieuw te proberen.
            </Text>
          </Pressable>
        ) : (
          <View style={styles.list}>
            {roots.map((node, i) => (
              <ListRow
                key={node.id}
                testID={`root-${node.id}`}
                title={node.name}
                leftIcon={iconFor(node)}
                subtitle={
                  node.is_plattegrond
                    ? "Bekijk de plattegrond"
                    : node.has_children
                      ? "Open zone"
                      : "Open documentatie"
                }
                onPress={() => open(node)}
                onLongPress={() => setActionNode(node)}
                reorderControls={
                  reordering
                    ? {
                        onUp: () => move(node.id, "up"),
                        onDown: () => move(node.id, "down"),
                        canUp: i > 0,
                        canDown: i < roots.length - 1,
                      }
                    : null
                }
              />
            ))}
            {reordering ? (
              <Text style={styles.hint}>Gebruik de pijltjes om de volgorde aan te passen.</Text>
            ) : (
              <>
                <Pressable
                  testID="add-root-page"
                  onPress={() => setAdding(true)}
                  style={styles.addRow}
                >
                  <Feather name="plus" size={20} color={colors.brand} />
                  <Text style={styles.addRowText}>Map of pagina toevoegen</Text>
                </Pressable>
                <Text style={styles.hint}>
                  Houd een item ingedrukt om te hernoemen of te verwijderen.
                </Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      <NameInputModal
        visible={adding}
        initialName=""
        title="Nieuw item"
        placeholder="Naam"
        chooseKind
        onClose={() => setAdding(false)}
        onSave={doAddPage}
      />
      <NameInputModal
        visible={!!renameTarget}
        initialName={renameTarget?.name ?? ""}
        title="Hernoemen"
        placeholder="Nieuwe naam"
        onClose={() => setRenameTarget(null)}
        onSave={doRename}
      />
      <NodeActionsSheet
        visible={!!actionNode}
        nodeName={actionNode?.name ?? ""}
        onRename={() => {
          setRenameTarget(actionNode);
          setActionNode(null);
        }}
        onMove={() => {
          setMoveTarget(actionNode);
          setActionNode(null);
        }}
        onDelete={() => {
          setDeleteTarget(actionNode);
          setActionNode(null);
        }}
        onClose={() => setActionNode(null)}
      />
      <MovePickerModal
        visible={!!moveTarget}
        nodeId={moveTarget?.id ?? null}
        onClose={() => setMoveTarget(null)}
        onMove={doMove}
      />
      <ConfirmSheet
        visible={!!deleteTarget}
        title={`"${deleteTarget?.name ?? ""}" verwijderen?`}
        message="Alle onderliggende pagina's, memo's, foto's, video's en PDF's worden ook verwijderd."
        onConfirm={doDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 240, backgroundColor: colors.surfaceInverse },
  heroLogo: {
    position: "absolute",
    left: spacing.lg,
    width: 35,
    height: 35,
    borderRadius: radius.sm,
    backgroundColor: "#FFFFFF",
    padding: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    padding: spacing.xl,
  },
  heroKicker: {
    fontFamily: font.bold,
    fontSize: type.sm,
    letterSpacing: 2,
    color: colors.brandTertiary,
    marginBottom: spacing.xs,
    textAlign: "right",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroTitle: {
    fontFamily: font.extrabold,
    fontSize: 28,
    color: colors.onSurfaceInverse,
    textAlign: "right",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  heroSubtitle: {
    fontFamily: font.medium,
    fontSize: type.base,
    color: "rgba(255,255,255,0.85)",
    marginTop: spacing.xs,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  searchText: {
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.onSurfaceTertiary,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontFamily: font.bold,
    fontSize: type.sm,
    letterSpacing: 1.5,
    color: colors.onSurfaceTertiary,
  },
  settingsBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  sectionActions: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  settingsText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.onSurfaceTertiary },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  addRowText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.brand },
  hint: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.onSurfaceTertiary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  loading: { paddingVertical: spacing["3xl"] },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    flex: 1,
    fontFamily: font.medium,
    fontSize: type.base,
    color: colors.error,
  },
});
