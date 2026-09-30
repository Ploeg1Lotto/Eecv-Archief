import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, Memo, NodeDetail, Pdf, Photo, Video } from "@/src/api";
import { DEFAULT_BANNERS } from "@/src/banners";
import { EmptyState, Header, ListRow } from "@/src/components";
import { openPdf, pickPdfBase64, sharePhoto } from "@/src/media";
import {
  ConfirmSheet,
  EditTextModal,
  ImageViewerModal,
  MovePickerModal,
  NameInputModal,
  NodeActionsSheet,
  PhotoCaptionModal,
  VideoPlayerModal,
} from "@/src/modals";
import { usePhotoCapture } from "@/src/use-photo-capture";
import { useVideoCapture } from "@/src/use-video-capture";
import { BannerSource, useBannerEditor } from "@/src/use-banner";
import { colors, font, radius, spacing, type } from "@/src/theme";

export default function NodeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [node, setNode] = useState<NodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      setNode(await api.getNode(id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Laden…" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </View>
    );
  }

  if (error || !node) {
    return (
      <View style={styles.container}>
        <Header title="Fout" />
        <View style={styles.center}>
          <EmptyState
            icon="alert-triangle"
            title="Kon locatie niet laden"
            subtitle="Controleer je verbinding en probeer opnieuw."
          />
        </View>
      </View>
    );
  }

  if (node.has_children) return <FolderView node={node} />;
  return <DetailView node={node} />;
}

/* ------------------------- Folder (zone) view ------------------------- */
// Resolve the banner to render: a user-set custom banner overrides the bundled
// default; an explicitly removed banner shows nothing. Reloads on screen focus.
function BannerBlock({
  nodeId,
  source,
  hasImage,
  onChange,
  onRemove,
  testIDPrefix,
}: {
  nodeId: string;
  source: BannerSource;
  hasImage: boolean;
  onChange: () => void;
  onRemove: () => void;
  testIDPrefix: string;
}) {
  if (hasImage) {
    return (
      <View>
        <Image
          testID={`${testIDPrefix}-${nodeId}`}
          source={source as number | { uri: string }}
          style={styles.zoneBanner}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.bannerOverlay}>
          <Pressable
            testID={`banner-change-${nodeId}`}
            onPress={onChange}
            style={styles.bannerBtn}
            hitSlop={6}
          >
            <Feather name="edit-2" size={16} color="#FFF" />
          </Pressable>
          <Pressable
            testID={`banner-remove-${nodeId}`}
            onPress={onRemove}
            style={styles.bannerBtn}
            hitSlop={6}
          >
            <Feather name="trash-2" size={16} color="#FFF" />
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <Pressable testID={`banner-add-${nodeId}`} onPress={onChange} style={styles.bannerAdd}>
      <Feather name="image" size={20} color={colors.brand} />
      <Text style={styles.bannerAddText}>Voorbladfoto toevoegen</Text>
    </Pressable>
  );
}

function FolderView({ node }: { node: NodeDetail }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const crumb = node.breadcrumb
    .slice(0, -1)
    .map((c) => c.name)
    .join(" › ");
  const banner = useBannerEditor(node.id, DEFAULT_BANNERS[node.id]);

  const [children, setChildren] = useState(node.children);
  const [adding, setAdding] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [actionNode, setActionNode] = useState<NodeDetail["children"][number] | null>(null);
  const [renameTarget, setRenameTarget] = useState<NodeDetail["children"][number] | null>(null);
  const [moveTarget, setMoveTarget] = useState<NodeDetail["children"][number] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NodeDetail["children"][number] | null>(null);

  const reload = useCallback(async () => {
    const fresh = await api.getNode(node.id);
    setChildren(fresh.children);
  }, [node.id]);

  const move = async (cid: string, direction: "up" | "down") => {
    await api.reorderNode(cid, direction);
    await reload();
  };

  const doAddPage = async (name: string, kind: "folder" | "page") => {
    await api.addNode(node.id, name, kind);
    await reload();
  };
  const doRename = async (name: string) => {
    if (!renameTarget) return;
    await api.renameNode(renameTarget.id, name);
    setRenameTarget(null);
    await reload();
  };
  const doDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteNode(deleteTarget.id);
    setDeleteTarget(null);
    await reload();
  };
  const doMove = async (targetId: string | null) => {
    if (!moveTarget) return;
    await api.moveNode(moveTarget.id, targetId);
    setMoveTarget(null);
    await reload();
  };

  return (
    <View style={styles.container}>
      <Header
        title={node.name}
        subtitle={crumb || "Terminal Referentie"}
        right={
          children.length > 1 ? (
            <Pressable
              testID="reorder-toggle"
              onPress={() => setReordering((r) => !r)}
              hitSlop={10}
            >
              <Feather
                name={reordering ? "check" : "move"}
                size={20}
                color={colors.brand}
              />
            </Pressable>
          ) : undefined
        }
      />
      <FlatList
        data={children}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        ListHeaderComponent={
          <BannerBlock
            nodeId={node.id}
            source={banner.source}
            hasImage={banner.hasImage}
            onChange={banner.change}
            onRemove={() => setRemoveBanner(true)}
            testIDPrefix="zone-banner"
          />
        }
        renderItem={({ item, index }) => (
          <ListRow
            testID={`child-${item.id}`}
            title={item.name}
            leftIcon={item.has_children ? "folder" : "file-text"}
            subtitle={item.has_children ? "Zone" : "Documentatie"}
            onPress={() => router.push(`/node/${item.id}`)}
            onLongPress={() => setActionNode(item)}
            reorderControls={
              reordering
                ? {
                    onUp: () => move(item.id, "up"),
                    onDown: () => move(item.id, "down"),
                    canUp: index > 0,
                    canDown: index < children.length - 1,
                  }
                : null
            }
          />
        )}
        ListFooterComponent={
          reordering ? (
            <Text style={styles.hint}>Gebruik de pijltjes om de volgorde aan te passen.</Text>
          ) : (
            <>
              <Pressable
                testID="add-child-page"
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
          )
        }
      />

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
      <ConfirmSheet
        visible={removeBanner}
        title="Voorbladfoto verwijderen?"
        message="De foto bovenaan deze pagina wordt verwijderd."
        onConfirm={async () => {
          await banner.remove();
          setRemoveBanner(false);
        }}
        onClose={() => setRemoveBanner(false)}
      />
      {banner.element}
    </View>
  );
}

/* ------------------------- Location detail view ------------------------- */
function formatDT(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function DetailView({ node }: { node: NodeDetail }) {
  const insets = useSafeAreaInsets();
  const photo = usePhotoCapture();
  const video = useVideoCapture();
  const banner = useBannerEditor(node.id, DEFAULT_BANNERS[node.id]);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pdfs, setPdfs] = useState<Pdf[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [addMemo, setAddMemo] = useState(false);
  const [editMemo, setEditMemo] = useState<Memo | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<Photo | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingPdf, setPendingPdf] = useState<{ data: string; filename: string } | null>(null);
  const [pendingVideo, setPendingVideo] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [editCaptionPhoto, setEditCaptionPhoto] = useState<Photo | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);

  const load = useCallback(async () => {
    const [content, list, pdfList, videoList] = await Promise.all([
      api.getContent(node.id),
      api.getMemos(node.id),
      api.getPdfs(node.id),
      api.getVideos(node.id),
    ]);
    setPhotos(content.photos);
    setMemos(list);
    setPdfs(pdfList);
    setVideos(videoList);
  }, [node.id]);

  useEffect(() => {
    load();
  }, [load]);

  const crumb = node.breadcrumb
    .slice(0, -1)
    .map((c) => c.name)
    .join(" › ");

  const saveMemo = async (text: string) => {
    if (!text.trim()) return;
    const memo = await api.createMemo(node.id, text.trim());
    setMemos((arr) => [memo, ...arr]);
  };

  const confirmDeleteMemo = async () => {
    if (!deleteId) return;
    await api.deleteMemo(deleteId);
    setMemos((arr) => arr.filter((m) => m.id !== deleteId));
    setDeleteId(null);
  };

  const saveEditMemo = async (text: string) => {
    if (!editMemo || !text.trim()) return;
    const updated = await api.updateMemo(editMemo.id, text.trim());
    setMemos((arr) => arr.map((m) => (m.id === updated.id ? updated : m)));
    setEditMemo(null);
  };

  const addPhoto = () => {
    photo.trigger((img) => setPendingImage(img));
  };

  const saveNewPhoto = async (caption: string) => {
    if (!pendingImage) return;
    const p = await api.addPhoto(node.id, pendingImage, caption);
    setPhotos((c) => [...c, p]);
    setPendingImage(null);
  };

  const saveCaption = async (caption: string) => {
    if (!editCaptionPhoto) return;
    await api.updateCaption(node.id, editCaptionPhoto.id, caption);
    setPhotos((c) => c.map((p) => (p.id === editCaptionPhoto.id ? { ...p, caption } : p)));
    setEditCaptionPhoto(null);
  };

  const removePhoto = async (photoId: string) => {
    await api.deletePhoto(node.id, photoId);
    setPhotos((c) => c.filter((p) => p.id !== photoId));
  };

  const doSharePhoto = async () => {
    if (!viewerPhoto) return;
    const ok = await sharePhoto(viewerPhoto.data, viewerPhoto.caption);
    if (!ok) {
      Alert.alert("Delen niet beschikbaar", "Delen werkt op een echt toestel na een build.");
    }
  };

  const addPdf = async () => {
    const picked = await pickPdfBase64();
    if (picked) setPendingPdf(picked);
  };
  const saveNewPdf = async (caption: string) => {
    if (!pendingPdf) return;
    const p = await api.addPdf(node.id, pendingPdf.data, pendingPdf.filename, caption);
    setPdfs((arr) => [...arr, p]);
    setPendingPdf(null);
  };
  const removePdf = async (pdfId: string) => {
    await api.deletePdf(node.id, pdfId);
    setPdfs((arr) => arr.filter((p) => p.id !== pdfId));
  };
  const doOpenPdf = async (p: Pdf) => {
    try {
      await openPdf({ data: p.data, filename: p.filename });
    } catch {
      Alert.alert("Openen niet beschikbaar", "Openen werkt op een echt toestel na een build.");
    }
  };

  const addVideo = () => {
    video.trigger((uri) => setPendingVideo(uri));
  };
  const saveNewVideo = async (caption: string) => {
    if (!pendingVideo) return;
    const v = await api.addVideo(node.id, pendingVideo, caption);
    setVideos((arr) => [...arr, v]);
    setPendingVideo(null);
  };
  const removeVideo = async (videoId: string) => {
    await api.deleteVideo(node.id, videoId);
    setVideos((arr) => arr.filter((v) => v.id !== videoId));
  };

  const headerRight = (
    <Pressable testID="add-memo-button" onPress={() => setAddMemo(true)} hitSlop={10}>
      <Feather name="plus" size={22} color={colors.brand} />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Header title={node.name} subtitle={crumb || "Terminal Referentie"} right={headerRight} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <BannerBlock
          nodeId={node.id}
          source={banner.source}
          hasImage={banner.hasImage}
          onChange={banner.change}
          onRemove={() => setRemoveBanner(true)}
          testIDPrefix="detail-banner"
        />
        <View style={styles.section}>
          {/* Memos */}
          <View style={styles.blockHeaderRow}>
            <Text style={styles.blockLabelTop}>MEMO'S</Text>
            <Pressable
              testID="add-memo-inline"
              onPress={() => setAddMemo(true)}
              style={styles.addMemoBtn}
              hitSlop={8}
            >
              <Feather name="plus" size={16} color={colors.brand} />
              <Text style={styles.addMemoText}>Memo toevoegen</Text>
            </Pressable>
          </View>

          {memos.length === 0 ? (
            <Pressable
              style={styles.textPlaceholder}
              onPress={() => setAddMemo(true)}
              testID="info-add-memo"
            >
              <Feather name="file-text" size={20} color={colors.onSurfaceTertiary} />
              <Text style={styles.placeholderText}>Tik om een memo toe te voegen</Text>
            </Pressable>
          ) : (
            <View style={styles.memoList}>
              {memos.map((m) => (
                <View key={m.id} style={styles.memoCard} testID={`memo-${m.id}`}>
                  <View style={styles.memoHeader}>
                    <View style={styles.memoDateWrap}>
                      <Feather name="clock" size={13} color={colors.onSurfaceTertiary} />
                      <Text style={styles.memoDate}>
                        {formatDT(m.created_at)}
                        {m.updated_at ? " · bewerkt" : ""}
                      </Text>
                    </View>
                    <View style={styles.memoActions}>
                      <Pressable
                        testID={`edit-memo-${m.id}`}
                        onPress={() => setEditMemo(m)}
                        hitSlop={8}
                      >
                        <Feather name="edit-2" size={15} color={colors.onSurfaceTertiary} />
                      </Pressable>
                      <Pressable
                        testID={`delete-memo-${m.id}`}
                        onPress={() => setDeleteId(m.id)}
                        hitSlop={8}
                      >
                        <Feather name="trash-2" size={16} color={colors.onSurfaceTertiary} />
                      </Pressable>
                    </View>
                  </View>
                  <Text style={styles.bodyText}>{m.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Photos */}
          <Text style={styles.blockLabel}>FOTO'S</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoRow}
          >
            {photos.map((p) => (
              <View key={p.id} style={styles.photoWrap}>
                <Pressable onPress={() => setViewerPhoto(p)} testID={`photo-${p.id}`}>
                  <Image source={{ uri: p.data }} style={styles.photo} contentFit="cover" />
                </Pressable>
                {p.created_at ? (
                  <Text style={styles.photoDate} numberOfLines={1}>
                    {formatDT(p.created_at)}
                  </Text>
                ) : null}
                {p.caption ? (
                  <View style={styles.photoCaptionBar}>
                    <Text style={styles.photoCaptionText} numberOfLines={2}>
                      {p.caption}
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  testID={`delete-photo-${p.id}`}
                  onPress={() => removePhoto(p.id)}
                  style={styles.photoDelete}
                  hitSlop={6}
                >
                  <Feather name="x" size={14} color="#FFF" />
                </Pressable>
              </View>
            ))}
            <Pressable testID="info-add-photo" onPress={addPhoto} style={styles.addTile}>
              <Feather name="camera" size={22} color={colors.brand} />
              <Text style={styles.addTileText}>Foto</Text>
            </Pressable>
          </ScrollView>

          {/* Videos */}
          <View style={styles.blockHeaderRow}>
            <Text style={styles.blockLabelTop}>VIDEO&apos;S</Text>
            <Pressable testID="add-video-inline" onPress={addVideo} style={styles.addMemoBtn} hitSlop={8}>
              <Feather name="plus" size={16} color={colors.brand} />
              <Text style={styles.addMemoText}>Video</Text>
            </Pressable>
          </View>
          {videos.length === 0 ? (
            <Pressable style={styles.textPlaceholder} onPress={addVideo} testID="info-add-video">
              <Feather name="video" size={20} color={colors.onSurfaceTertiary} />
              <Text style={styles.placeholderText}>Tik om een video toe te voegen</Text>
            </Pressable>
          ) : (
            <View style={styles.memoList}>
              {videos.map((v) => (
                <Pressable
                  key={v.id}
                  style={styles.fileRow}
                  testID={`video-${v.id}`}
                  onPress={() => setPlayingVideo(v.uri)}
                >
                  <View style={styles.fileIcon}>
                    <Feather name="play" size={18} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {v.caption ? v.caption : "Video"}
                    </Text>
                    {v.created_at ? (
                      <Text style={styles.fileMeta}>{formatDT(v.created_at)}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    testID={`delete-video-${v.id}`}
                    onPress={() => removeVideo(v.id)}
                    hitSlop={8}
                    style={styles.fileDelete}
                  >
                    <Feather name="trash-2" size={16} color={colors.onSurfaceTertiary} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}

          {/* PDFs */}
          <View style={styles.blockHeaderRow}>
            <Text style={styles.blockLabelTop}>PDF&apos;S</Text>
            <Pressable testID="add-pdf-inline" onPress={addPdf} style={styles.addMemoBtn} hitSlop={8}>
              <Feather name="plus" size={16} color={colors.brand} />
              <Text style={styles.addMemoText}>PDF</Text>
            </Pressable>
          </View>
          {pdfs.length === 0 ? (
            <Pressable style={styles.textPlaceholder} onPress={addPdf} testID="info-add-pdf">
              <Feather name="file-text" size={20} color={colors.onSurfaceTertiary} />
              <Text style={styles.placeholderText}>Tik om een PDF toe te voegen</Text>
            </Pressable>
          ) : (
            <View style={styles.memoList}>
              {pdfs.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.fileRow}
                  testID={`pdf-${p.id}`}
                  onPress={() => doOpenPdf(p)}
                >
                  <View style={styles.fileIcon}>
                    <Feather name="file-text" size={18} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {p.caption ? p.caption : p.filename}
                    </Text>
                    {p.created_at ? (
                      <Text style={styles.fileMeta}>{formatDT(p.created_at)}</Text>
                    ) : null}
                  </View>
                  <Pressable
                    testID={`delete-pdf-${p.id}`}
                    onPress={() => removePdf(p.id)}
                    hitSlop={8}
                    style={styles.fileDelete}
                  >
                    <Feather name="trash-2" size={16} color={colors.onSurfaceTertiary} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <EditTextModal
        visible={addMemo}
        initialText=""
        title="Nieuwe memo"
        placeholder="Typ je memo…"
        onClose={() => setAddMemo(false)}
        onSave={saveMemo}
      />
      <EditTextModal
        visible={!!editMemo}
        initialText={editMemo?.text ?? ""}
        title="Memo bewerken"
        placeholder="Typ je memo…"
        onClose={() => setEditMemo(null)}
        onSave={saveEditMemo}
      />
      <ImageViewerModal
        photo={viewerPhoto}
        onClose={() => setViewerPhoto(null)}
        onShare={doSharePhoto}
        onEditCaption={() => {
          setEditCaptionPhoto(viewerPhoto);
          setViewerPhoto(null);
        }}
      />
      <PhotoCaptionModal
        visible={!!pendingImage}
        imageUri={pendingImage}
        initialCaption=""
        title="Foto toevoegen"
        onClose={() => setPendingImage(null)}
        onSave={saveNewPhoto}
      />
      <PhotoCaptionModal
        visible={!!editCaptionPhoto}
        imageUri={editCaptionPhoto?.data ?? null}
        initialCaption={editCaptionPhoto?.caption ?? ""}
        title="Bijschrift bewerken"
        onClose={() => setEditCaptionPhoto(null)}
        onSave={saveCaption}
      />
      <PhotoCaptionModal
        visible={!!pendingVideo}
        imageUri={null}
        initialCaption=""
        title="Video toevoegen"
        onClose={() => setPendingVideo(null)}
        onSave={saveNewVideo}
      />
      <PhotoCaptionModal
        visible={!!pendingPdf}
        imageUri={null}
        initialCaption=""
        title="PDF toevoegen"
        onClose={() => setPendingPdf(null)}
        onSave={saveNewPdf}
      />
      <ConfirmSheet
        visible={!!deleteId}
        title="Memo verwijderen?"
        message="Deze memo wordt permanent verwijderd."
        onConfirm={confirmDeleteMemo}
        onClose={() => setDeleteId(null)}
      />
      <ConfirmSheet
        visible={removeBanner}
        title="Voorbladfoto verwijderen?"
        message="De foto bovenaan deze pagina wordt verwijderd."
        onConfirm={async () => {
          await banner.remove();
          setRemoveBanner(false);
        }}
        onClose={() => setRemoveBanner(false)}
      />
      {playingVideo ? (
        <VideoPlayerModal uri={playingVideo} onClose={() => setPlayingVideo(null)} />
      ) : null}
      {photo.element}
      {video.element}
      {banner.element}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  zoneBanner: {
    width: "100%",
    height: 180,
    backgroundColor: colors.surfaceSecondary,
  },
  bannerOverlay: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
  },
  bannerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerAdd: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.brand,
  },
  bannerAddText: { fontFamily: font.semibold, fontSize: type.base, color: colors.brand },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  addRowText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.brand },
  hint: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.onSurfaceTertiary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  blockHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  blockLabelTop: {
    fontFamily: font.bold,
    fontSize: type.sm,
    letterSpacing: 1.2,
    color: colors.onSurfaceTertiary,
  },
  addMemoBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  addMemoText: { fontFamily: font.semibold, fontSize: type.base, color: colors.brand },
  memoList: { gap: spacing.sm },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onSurface },
  fileMeta: {
    fontFamily: font.semibold,
    fontSize: type.sm,
    color: colors.onSurfaceTertiary,
    marginTop: 2,
  },
  fileDelete: { padding: spacing.xs },
  memoCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  memoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  memoDateWrap: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  memoActions: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  memoDate: {
    fontFamily: font.semibold,
    fontSize: type.sm,
    color: colors.onSurfaceTertiary,
  },
  bodyText: {
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.onSurface,
    lineHeight: 24,
  },
  textPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  placeholderText: {
    fontFamily: font.medium,
    fontSize: type.base,
    color: colors.onSurfaceTertiary,
  },
  blockLabel: {
    fontFamily: font.bold,
    fontSize: type.sm,
    letterSpacing: 1.2,
    color: colors.onSurfaceTertiary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  photoRow: { gap: spacing.sm, paddingRight: spacing.lg },
  photoWrap: { width: 100 },
  photo: { width: 100, height: 100, borderRadius: radius.md },
  photoCaptionBar: {
    marginTop: 2,
    width: 100,
  },
  photoDate: {
    marginTop: 4,
    width: 100,
    fontFamily: font.semibold,
    fontSize: 11,
    color: colors.onSurfaceTertiary,
  },
  photoCaptionText: {
    fontFamily: font.medium,
    fontSize: type.sm,
    color: colors.onSurfaceSecondary,
    lineHeight: 15,
  },
  photoDelete: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  addTile: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  addTileText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.brand },
});
