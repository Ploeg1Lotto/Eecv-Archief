import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState, ListRow } from "@/src/components";
import { api, Node } from "@/src/api";
import { colors, font, radius, spacing, type } from "@/src/theme";

type Result = Node & { match: string };

const MATCH_LABEL: Record<string, string> = {
  naam: "Overeenkomst in naam",
  memo: "Overeenkomst in memo",
  foto: "Overeenkomst in fotobijschrift",
  pdf: "Overeenkomst in PDF-naam",
};

export default function Search() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = (q: string) => {
    setQuery(q);
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search(q.trim());
        setResults(res);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const open = (node: Result) => {
    if (node.is_plattegrond) router.replace("/plattegrond");
    else router.push(`/node/${node.id}`);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.searchHeader, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          testID="search-back"
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Feather name="chevron-left" size={26} color={colors.onSurface} />
        </Pressable>
        <View style={styles.inputWrap}>
          <Feather name="search" size={18} color={colors.onSurfaceTertiary} />
          <TextInput
            testID="search-input"
            style={styles.input}
            placeholder="Zoek locatie of inhoud…"
            placeholderTextColor={colors.onSurfaceTertiary}
            value={query}
            onChangeText={runSearch}
            autoFocus
            returnKeyType="search"
          />
          {query ? (
            <Pressable testID="search-clear" onPress={() => runSearch("")} hitSlop={10}>
              <Feather name="x" size={18} color={colors.onSurfaceTertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : searched && results.length === 0 ? (
        <EmptyState
          testID="search-empty"
          icon="search"
          title="Geen resultaten"
          subtitle={`Niets gevonden voor "${query}".`}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <ListRow
              testID={`result-${item.id}`}
              title={item.name}
              subtitle={MATCH_LABEL[item.match] ?? "Overeenkomst in inhoud"}
              leftIcon={item.is_plattegrond ? "map" : item.has_children ? "folder" : "file-text"}
              onPress={() => open(item)}
            />
          )}
          ListHeaderComponent={
            !searched ? (
              <View style={styles.hint}>
                <Text style={styles.hintText}>
                  Begin met typen om te zoeken in zones, locaties en documentatie.
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  input: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.onSurface,
    padding: 0,
  },
  loading: { paddingVertical: spacing["3xl"] },
  hint: { padding: spacing.xl },
  hintText: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.onSurfaceTertiary,
    textAlign: "center",
  },
});
