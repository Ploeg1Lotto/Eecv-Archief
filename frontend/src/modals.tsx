import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { openPdf, writePdfToCache } from "./media";
import { api } from "./api";
import { SegmentedControl } from "./components";
import { usePhotoCapture } from "./use-photo-capture";
import { colors, font, radius, spacing, STATUS_META, type } from "./theme";

function formatPhotoDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* ------------------------- Shared modal header ------------------------- */
function ModalHeader({
  title,
  onClose,
  onSave,
  saveLabel = "Opslaan",
  saving,
  canSave = true,
}: {
  title: string;
  onClose: () => void;
  onSave?: () => void;
  saveLabel?: string;
  saving?: boolean;
  canSave?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[mstyles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable testID="modal-close" onPress={onClose} hitSlop={12} style={mstyles.headerBtn}>
        <Feather name="x" size={24} color={colors.onSurface} />
      </Pressable>
      <Text numberOfLines={1} style={mstyles.headerTitle}>
        {title}
      </Text>
      {onSave ? (
        <Pressable
          testID="modal-save"
          onPress={onSave}
          disabled={!canSave || saving}
          hitSlop={12}
          style={mstyles.headerBtn}
        >
          <Text style={[mstyles.saveText, (!canSave || saving) && { opacity: 0.4 }]}>
            {saving ? "…" : saveLabel}
          </Text>
        </Pressable>
      ) : (
        <View style={mstyles.headerBtn} />
      )}
    </View>
  );
}

/* ------------------------- Edit text ------------------------- */
export function EditTextModal({
  visible,
  initialText,
  onClose,
  onSave,
  title = "Informatie bewerken",
  placeholder = "Voeg instructies, aandachtspunten of documentatie toe…",
}: {
  visible: boolean;
  initialText: string;
  onClose: () => void;
  onSave: (text: string) => Promise<void>;
  title?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setText(initialText);
  }, [visible, initialText]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(text);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={mstyles.screen}>
        <ModalHeader title={title} onClose={onClose} onSave={save} saving={saving} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={16}
        >
          <TextInput
            testID="edit-text-input"
            style={mstyles.bigInput}
            value={text}
            onChangeText={setText}
            multiline
            placeholder={placeholder}
            placeholderTextColor={colors.onSurfaceTertiary}
            textAlignVertical="top"
            autoFocus
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ------------------------- Photo picker row (inline) ------------------------- */
function PhotoGrid({
  photos,
  onAdd,
  onRemove,
}: {
  photos: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <View style={mstyles.photoGrid}>
      {photos.map((p, i) => (
        <View key={i} style={mstyles.photoThumbWrap}>
          <Image source={{ uri: p }} style={mstyles.photoThumb} contentFit="cover" />
          <Pressable
            testID={`remove-photo-${i}`}
            onPress={() => onRemove(i)}
            style={mstyles.photoRemove}
            hitSlop={6}
          >
            <Feather name="x" size={14} color="#FFF" />
          </Pressable>
        </View>
      ))}
      <Pressable testID="add-photo-button" onPress={onAdd} style={mstyles.photoAdd}>
        <Feather name="camera" size={22} color={colors.brand} />
        <Text style={mstyles.photoAddText}>Foto</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------- Storing form ------------------------- */
export type StoringInput = {
  title: string;
  description: string;
  status: string;
  photos: string[];
};

export function StoringModal({
  visible,
  initial,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  initial?: StoringInput | null;
  onClose: () => void;
  onSubmit: (data: StoringInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const photo = usePhotoCapture();

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? "");
      setDescription(initial?.description ?? "");
      setStatus(initial?.status ?? "open");
      setPhotos(initial?.photos ?? []);
    }
  }, [visible, initial]);

  const addPhoto = () => photo.trigger((img) => setPhotos((p) => [...p, img]));

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), status, photos });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={mstyles.screen}>
        <ModalHeader
          title={initial ? "Storing bewerken" : "Nieuwe storing"}
          onClose={onClose}
          onSave={save}
          saving={saving}
          canSave={!!title.trim()}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={16}
        >
          <ScrollView
            contentContainerStyle={mstyles.formBody}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={mstyles.label}>Titel</Text>
            <TextInput
              testID="storing-title-input"
              style={mstyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Korte omschrijving"
              placeholderTextColor={colors.onSurfaceTertiary}
            />

            <Text style={mstyles.label}>Omschrijving</Text>
            <TextInput
              testID="storing-desc-input"
              style={[mstyles.input, mstyles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Details van de storing…"
              placeholderTextColor={colors.onSurfaceTertiary}
              multiline
              textAlignVertical="top"
            />

            <Text style={mstyles.label}>Status</Text>
            <View style={mstyles.statusRow}>
              {Object.entries(STATUS_META).map(([key, meta]) => {
                const active = key === status;
                return (
                  <Pressable
                    key={key}
                    testID={`status-${key}`}
                    onPress={() => setStatus(key)}
                    style={[
                      mstyles.statusChip,
                      { borderColor: active ? meta.fg : colors.border },
                      active && { backgroundColor: meta.bg },
                    ]}
                  >
                    <Text style={[mstyles.statusChipText, { color: active ? meta.fg : colors.onSurfaceTertiary }]}>
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={mstyles.label}>{"Foto's"}</Text>
            <PhotoGrid
              photos={photos}
              onAdd={addPhoto}
              onRemove={(i) => setPhotos((p) => p.filter((_, idx) => idx !== i))}
            />
          </ScrollView>
        </KeyboardAvoidingView>
        {photo.element}
      </View>
    </Modal>
  );
}

/* ------------------------- Checklist form ------------------------- */
export function ChecklistModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, items: string[]) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setTitle("");
      setItems([""]);
    }
  }, [visible]);

  const setItem = (i: number, v: string) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? v : it)));

  const save = async () => {
    const clean = items.map((i) => i.trim()).filter(Boolean);
    if (!title.trim() || clean.length === 0) return;
    setSaving(true);
    try {
      await onSubmit(title.trim(), clean);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSave = !!title.trim() && items.some((i) => i.trim());

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={mstyles.screen}>
        <ModalHeader
          title="Nieuwe checklist"
          onClose={onClose}
          onSave={save}
          saving={saving}
          canSave={canSave}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={16}
        >
          <ScrollView contentContainerStyle={mstyles.formBody} keyboardShouldPersistTaps="handled">
            <Text style={mstyles.label}>Titel</Text>
            <TextInput
              testID="checklist-title-input"
              style={mstyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Naam van de checklist"
              placeholderTextColor={colors.onSurfaceTertiary}
            />

            <Text style={mstyles.label}>Punten</Text>
            {items.map((item, i) => (
              <View key={i} style={mstyles.itemRow}>
                <Feather name="check-circle" size={18} color={colors.onSurfaceTertiary} />
                <TextInput
                  testID={`checklist-item-${i}`}
                  style={mstyles.itemInput}
                  value={item}
                  onChangeText={(v) => setItem(i, v)}
                  placeholder={`Punt ${i + 1}`}
                  placeholderTextColor={colors.onSurfaceTertiary}
                />
                {items.length > 1 ? (
                  <Pressable
                    testID={`remove-item-${i}`}
                    onPress={() => setItems((arr) => arr.filter((_, idx) => idx !== i))}
                    hitSlop={8}
                  >
                    <Feather name="minus-circle" size={20} color={colors.error} />
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Pressable
              testID="add-item-button"
              onPress={() => setItems((arr) => [...arr, ""])}
              style={mstyles.addItem}
            >
              <Feather name="plus" size={18} color={colors.brand} />
              <Text style={mstyles.addItemText}>Punt toevoegen</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ------------------------- Photo caption ------------------------- */
export function PhotoCaptionModal({
  visible,
  imageUri,
  initialCaption,
  onClose,
  onSave,
  title = "Bijschrift toevoegen",
}: {
  visible: boolean;
  imageUri: string | null;
  initialCaption: string;
  onClose: () => void;
  onSave: (caption: string) => Promise<void>;
  title?: string;
}) {
  const [caption, setCaption] = useState(initialCaption);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setCaption(initialCaption);
  }, [visible, initialCaption]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(caption.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={mstyles.screen}>
        <ModalHeader title={title} onClose={onClose} onSave={save} saving={saving} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={16}
        >
          <ScrollView contentContainerStyle={mstyles.formBody} keyboardShouldPersistTaps="handled">
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={mstyles.captionPreview} contentFit="cover" />
            ) : null}
            <Text style={mstyles.label}>Bijschrift</Text>
            <TextInput
              testID="caption-input"
              style={[mstyles.input, mstyles.textarea]}
              value={caption}
              onChangeText={setCaption}
              placeholder="Tekst ter verduidelijking (optioneel)…"
              placeholderTextColor={colors.onSurfaceTertiary}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ------------------------- Image viewer ------------------------- */
export function ImageViewerModal({
  photo,
  onClose,
  onShare,
  onEditCaption,
}: {
  photo: { id: string; data: string; caption?: string; created_at?: string } | null;
  onClose: () => void;
  onShare?: () => void;
  onEditCaption?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const dateLabel = photo?.created_at ? formatPhotoDate(photo.created_at) : "";
  return (
    <Modal visible={!!photo} transparent animationType="fade" onRequestClose={onClose}>
      <View style={mstyles.viewer}>
        <View style={[mstyles.viewerBar, { top: insets.top + spacing.sm }]}>
          <Pressable testID="image-viewer-close" onPress={onClose} hitSlop={10} style={mstyles.viewerBtn}>
            <Feather name="x" size={26} color="#FFF" />
          </Pressable>
          <View style={mstyles.viewerActions}>
            {onEditCaption ? (
              <Pressable testID="image-viewer-caption" onPress={onEditCaption} hitSlop={10} style={mstyles.viewerBtn}>
                <Feather name="edit-2" size={22} color="#FFF" />
              </Pressable>
            ) : null}
            {onShare ? (
              <Pressable testID="image-viewer-share" onPress={onShare} hitSlop={10} style={mstyles.viewerBtn}>
                <Feather name="share-2" size={22} color="#FFF" />
              </Pressable>
            ) : null}
          </View>
        </View>
        {photo ? (
          <Image source={{ uri: photo.data }} style={mstyles.viewerImage} contentFit="contain" />
        ) : null}
        {photo && (dateLabel || photo.caption) ? (
          <View style={[mstyles.viewerCaption, { paddingBottom: insets.bottom + spacing.lg }]}>
            {dateLabel ? <Text style={mstyles.viewerDateText}>{dateLabel}</Text> : null}
            {photo.caption ? <Text style={mstyles.viewerCaptionText}>{photo.caption}</Text> : null}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

/* ------------------------- PDF viewer (inline) ------------------------- */
export function PdfViewerModal({
  pdf,
  onClose,
}: {
  pdf: { data: string; filename: string } | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (pdf) {
      setUri(null);
      writePdfToCache(pdf).then((u) => {
        if (active) setUri(u);
      });
    } else {
      setUri(null);
    }
    return () => {
      active = false;
    };
  }, [pdf]);

  return (
    <Modal visible={!!pdf} animationType="slide" onRequestClose={onClose}>
      <View style={mstyles.screen}>
        <View style={[mstyles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable testID="pdf-close" onPress={onClose} hitSlop={12} style={mstyles.headerBtn}>
            <Feather name="x" size={24} color={colors.onSurface} />
          </Pressable>
          <Text numberOfLines={1} style={mstyles.headerTitle}>
            {pdf?.filename ?? "Document"}
          </Text>
          <Pressable
            testID="pdf-share"
            onPress={() => pdf && openPdf(pdf)}
            hitSlop={12}
            style={[mstyles.headerBtn, { alignItems: "flex-end" }]}
          >
            <Feather name="share" size={20} color={colors.brand} />
          </Pressable>
        </View>
        {uri ? (
          <WebView
            testID="pdf-webview"
            source={{ uri }}
            originWhitelist={["file://*"]}
            allowFileAccess
            style={{ flex: 1 }}
            startInLoadingState
            renderLoading={() => (
              <View style={mstyles.pdfLoading}>
                <ActivityIndicator color={colors.brand} />
              </View>
            )}
          />
        ) : (
          <View style={mstyles.pdfLoading}>
            <ActivityIndicator color={colors.brand} />
          </View>
        )}
        {Platform.OS === "android" ? (
          <Pressable
            testID="pdf-open-external"
            style={[mstyles.pdfFooter, { paddingBottom: insets.bottom + spacing.md }]}
            onPress={() => pdf && openPdf(pdf)}
          >
            <Feather name="external-link" size={18} color={colors.brand} />
            <Text style={mstyles.pdfFooterText}>Openen in andere app</Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

/* ------------------------- Node name input (create / rename) ------------------------- */
export function NameInputModal({
  visible,
  initialName,
  title,
  placeholder = "Naam",
  chooseKind = false,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialName: string;
  title: string;
  placeholder?: string;
  chooseKind?: boolean;
  onClose: () => void;
  onSave: (name: string, kind: "folder" | "page") => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [kind, setKind] = useState<"folder" | "page">("page");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setKind("page");
    }
  }, [visible, initialName]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), kind);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={mstyles.screen}>
        <ModalHeader
          title={title}
          onClose={onClose}
          onSave={save}
          saving={saving}
          canSave={!!name.trim()}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={16}
        >
          <ScrollView contentContainerStyle={mstyles.formBody} keyboardShouldPersistTaps="handled">
            {chooseKind ? (
              <>
                <Text style={mstyles.label}>Type</Text>
                <SegmentedControl
                  options={[
                    { key: "page", label: "Pagina" },
                    { key: "folder", label: "Map" },
                  ]}
                  value={kind}
                  onChange={(k) => setKind(k as "folder" | "page")}
                />
                <Text style={mstyles.kindHint}>
                  {kind === "folder"
                    ? "Een map kan submappen en pagina's bevatten."
                    : "Een pagina bevat memo's, foto's, video's en PDF's."}
                </Text>
              </>
            ) : null}
            <Text style={mstyles.label}>Naam</Text>
            <TextInput
              testID="name-input"
              style={mstyles.input}
              value={name}
              onChangeText={setName}
              placeholder={placeholder}
              placeholderTextColor={colors.onSurfaceTertiary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={save}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ------------------------- Node actions (rename / delete) ------------------------- */
export function NodeActionsSheet({
  visible,
  nodeName,
  onRename,
  onMove,
  onDelete,
  onClose,
}: {
  visible: boolean;
  nodeName: string;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={mstyles.confirmBackdrop} onPress={onClose}>
        <Pressable style={[mstyles.confirmSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={mstyles.confirmTitle} numberOfLines={1}>
            {nodeName}
          </Text>
          <Pressable testID="action-rename" style={mstyles.actionBtn} onPress={onRename}>
            <Feather name="edit-2" size={18} color={colors.brand} />
            <Text style={mstyles.actionText}>Hernoemen</Text>
          </Pressable>
          <Pressable testID="action-move" style={mstyles.actionBtn} onPress={onMove}>
            <Feather name="corner-up-right" size={18} color={colors.brand} />
            <Text style={mstyles.actionText}>Verplaatsen</Text>
          </Pressable>
          <Pressable testID="action-delete" style={mstyles.actionBtn} onPress={onDelete}>
            <Feather name="trash-2" size={18} color={colors.error} />
            <Text style={[mstyles.actionText, { color: colors.error }]}>Verwijderen</Text>
          </Pressable>
          <Pressable testID="action-cancel" style={mstyles.confirmCancel} onPress={onClose}>
            <Text style={mstyles.confirmCancelText}>Annuleren</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ------------------------- Move picker (choose target folder) ------------------------- */
export function MovePickerModal({
  visible,
  nodeId,
  onClose,
  onMove,
}: {
  visible: boolean;
  nodeId: string | null;
  onClose: () => void;
  onMove: (targetId: string | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const [options, setOptions] = useState<{ id: string | null; name: string; depth: number }[]>([]);

  useEffect(() => {
    if (!visible || !nodeId) return;
    let active = true;
    (async () => {
      const tree = await api.getTree();
      const excl = new Set<string>();
      const collect = (nid: string) => {
        excl.add(nid);
        tree.filter((n) => n.parent_id === nid).forEach((c) => collect(c.id));
      };
      collect(nodeId);
      const current = tree.find((n) => n.id === nodeId);
      const currentParent = current?.parent_id ?? null;
      const opts: { id: string | null; name: string; depth: number }[] = [
        { id: null, name: "Hoofdscherm", depth: 0 },
      ];
      const walk = (parentId: string | null, depth: number) => {
        tree
          .filter((n) => n.parent_id === parentId && n.has_children && !n.is_plattegrond)
          .sort((a, b) => a.order - b.order)
          .forEach((n) => {
            if (excl.has(n.id)) return;
            opts.push({ id: n.id, name: n.name, depth });
            walk(n.id, depth + 1);
          });
      };
      walk(null, 1);
      if (active) setOptions(opts.filter((o) => o.id !== currentParent));
    })();
    return () => {
      active = false;
    };
  }, [visible, nodeId]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={mstyles.screen}>
        <View style={[mstyles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable testID="move-close" onPress={onClose} hitSlop={12} style={mstyles.headerBtn}>
            <Feather name="x" size={24} color={colors.onSurface} />
          </Pressable>
          <Text numberOfLines={1} style={mstyles.headerTitle}>
            Verplaatsen naar…
          </Text>
          <View style={mstyles.headerBtn} />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}>
          {options.map((o) => (
            <Pressable
              key={o.id ?? "root"}
              testID={`move-target-${o.id ?? "root"}`}
              style={mstyles.moveRow}
              onPress={() => onMove(o.id)}
            >
              <View style={{ width: o.depth * spacing.lg }} />
              <Feather
                name={o.id === null ? "home" : "folder"}
                size={18}
                color={colors.brand}
              />
              <Text style={mstyles.moveName} numberOfLines={1}>
                {o.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ------------------------- Confirm sheet ------------------------- */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = "Verwijderen",
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={mstyles.confirmBackdrop} onPress={onClose}>
        <Pressable style={[mstyles.confirmSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={mstyles.confirmTitle}>{title}</Text>
          {message ? <Text style={mstyles.confirmMessage}>{message}</Text> : null}
          <Pressable testID="confirm-delete" style={mstyles.confirmDelete} onPress={onConfirm}>
            <Text style={mstyles.confirmDeleteText}>{confirmLabel}</Text>
          </Pressable>
          <Pressable testID="confirm-cancel" style={mstyles.confirmCancel} onPress={onClose}>
            <Text style={mstyles.confirmCancelText}>Annuleren</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ------------------------- Video player ------------------------- */
export function VideoPlayerModal({ uri, onClose }: { uri: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={mstyles.viewer}>
        <View style={[mstyles.viewerBar, { top: insets.top + spacing.sm }]}>
          <Pressable
            testID="video-player-close"
            onPress={onClose}
            hitSlop={10}
            style={mstyles.viewerBtn}
          >
            <Feather name="x" size={26} color="#FFF" />
          </Pressable>
        </View>
        <VideoView
          style={mstyles.videoView}
          player={player}
          allowsFullscreen
          nativeControls
          contentFit="contain"
        />
      </View>
    </Modal>
  );
}


const mstyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBtn: { minWidth: 60, height: 32, justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: font.bold,
    fontSize: type.lg,
    color: colors.onSurface,
  },
  saveText: {
    fontFamily: font.bold,
    fontSize: type.lg,
    color: colors.brand,
    textAlign: "right",
  },
  bigInput: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.onSurface,
    padding: spacing.xl,
    lineHeight: 24,
  },
  formBody: { padding: spacing.xl, gap: spacing.xs, paddingBottom: spacing["3xl"] },
  label: {
    fontFamily: font.semibold,
    fontSize: type.base,
    color: colors.onSurfaceSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: font.regular,
    fontSize: type.lg,
    color: colors.onSurface,
    backgroundColor: colors.surface,
    minHeight: 50,
  },
  textarea: { minHeight: 110 },
  kindHint: {
    fontFamily: font.regular,
    fontSize: type.sm,
    color: colors.onSurfaceTertiary,
    marginTop: spacing.xs,
    marginHorizontal: spacing.lg,
  },
  statusRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  statusChip: {
    paddingHorizontal: spacing.lg,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChipText: { fontFamily: font.semibold, fontSize: type.base },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  photoThumbWrap: { width: 84, height: 84 },
  photoThumb: { width: 84, height: 84, borderRadius: radius.md },
  photoRemove: {
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
  photoAdd: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  photoAddText: { fontFamily: font.semibold, fontSize: type.sm, color: colors.brand },
  permBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "#FEFCE8",
  },
  permText: { flex: 1, fontFamily: font.medium, fontSize: type.sm, color: "#854D0E" },
  pdfLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  pdfFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  pdfFooterText: { fontFamily: font.semibold, fontSize: type.base, color: colors.brand },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  itemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.onSurface,
  },
  addItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.sm },
  addItemText: { fontFamily: font.semibold, fontSize: type.base, color: colors.brand },
  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" },
  viewerImage: { width: "100%", height: "80%" },
  videoView: { width: "100%", height: "80%" },
  viewerBar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewerActions: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  viewerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  viewerCaption: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  viewerCaptionText: {
    fontFamily: font.medium,
    fontSize: type.lg,
    color: "#FFF",
    textAlign: "center",
    lineHeight: 22,
  },
  viewerDateText: {
    fontFamily: font.semibold,
    fontSize: type.sm,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  captionPreview: {
    width: "100%",
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    marginBottom: spacing.md,
  },
  confirmBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  confirmSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
  },
  confirmTitle: { fontFamily: font.bold, fontSize: type.xl, color: colors.onSurface, textAlign: "center" },
  confirmMessage: {
    fontFamily: font.regular,
    fontSize: type.base,
    color: colors.onSurfaceSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  confirmDelete: {
    marginTop: spacing.lg,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteText: { fontFamily: font.bold, fontSize: type.lg, color: colors.onError },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    height: 52,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  actionText: { fontFamily: font.semibold, fontSize: type.lg, color: colors.onSurface },
  moveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  moveName: { flex: 1, fontFamily: font.semibold, fontSize: type.lg, color: colors.onSurface },
  confirmCancel: { marginTop: spacing.sm, height: 46, alignItems: "center", justifyContent: "center" },
  confirmCancelText: { fontFamily: font.semibold, fontSize: type.base, color: colors.onSurfaceTertiary },
});
