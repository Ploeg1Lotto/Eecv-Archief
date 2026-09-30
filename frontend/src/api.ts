// Fully local data layer — all data lives on the device (AsyncStorage + FileSystem).
// No server required for normal operation. A one-time migration can import any
// memos that still live on the old backend.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { flatten, Node } from "./tree";
import { deleteImage, getImage, putImage } from "./webimages";

export type { Node };
export type NodeDetail = Node & {
  children: Node[];
  breadcrumb: { id: string; name: string }[];
};
export type Photo = { id: string; data: string; caption?: string; created_at?: string };
export type Pdf = {
  id: string;
  data: string;
  filename: string;
  caption?: string;
  created_at?: string;
};
export type Video = { id: string; uri: string; caption?: string; created_at?: string };
export type Content = { node_id: string; photos: Photo[] };
export type Memo = {
  id: string;
  node_id: string;
  node_name: string;
  text: string;
  created_at: string;
  updated_at?: string;
};

const BASE = flatten();

const NODES_KEY = "terminal.nodes.v1";
const RENAMES_KEY = "terminal.nodeRenames.v1";
const DELETED_KEY = "terminal.nodesDeleted.v1";
const ORDERS_KEY = "terminal.nodeOrders.v1";
const PARENTS_KEY = "terminal.nodeParents.v1";
type CustomNode = {
  id: string;
  name: string;
  parent_id: string | null;
  order: number;
  depth: number;
  kind: "folder" | "page";
};
async function readCustomNodes(): Promise<CustomNode[]> {
  const raw = await AsyncStorage.getItem(NODES_KEY);
  return raw ? (JSON.parse(raw) as CustomNode[]) : [];
}
async function writeCustomNodes(nodes: CustomNode[]): Promise<void> {
  await AsyncStorage.setItem(NODES_KEY, JSON.stringify(nodes));
}
async function readRenames(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(RENAMES_KEY);
  return raw ? (JSON.parse(raw) as Record<string, string>) : {};
}
async function writeRenames(r: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(RENAMES_KEY, JSON.stringify(r));
}
async function readDeleted(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(DELETED_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}
async function writeDeleted(d: string[]): Promise<void> {
  await AsyncStorage.setItem(DELETED_KEY, JSON.stringify(d));
}
async function readOrders(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(ORDERS_KEY);
  return raw ? (JSON.parse(raw) as Record<string, number>) : {};
}
async function writeOrders(o: Record<string, number>): Promise<void> {
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(o));
}
async function readParents(): Promise<Record<string, string | null>> {
  const raw = await AsyncStorage.getItem(PARENTS_KEY);
  return raw ? (JSON.parse(raw) as Record<string, string | null>) : {};
}
async function writeParents(p: Record<string, string | null>): Promise<void> {
  await AsyncStorage.setItem(PARENTS_KEY, JSON.stringify(p));
}
async function getAllNodes(): Promise<Node[]> {
  const [custom, renames, deleted, orders, parentOverrides] = await Promise.all([
    readCustomNodes(),
    readRenames(),
    readDeleted(),
    readOrders(),
    readParents(),
  ]);
  const deletedSet = new Set(deleted);
  const base: Node[] = [
    ...BASE.map((n) => ({ ...n })),
    ...custom.map((c) => ({
      id: c.id,
      name: c.name,
      parent_id: c.parent_id,
      order: c.order,
      depth: c.depth,
      has_children: false,
      is_plattegrond: false,
    })),
  ].filter((n) => !deletedSet.has(n.id));
  const withOverrides = base.map((n) => ({
    ...n,
    name: renames[n.id] ?? n.name,
    order: orders[n.id] ?? n.order,
    parent_id: n.id in parentOverrides ? parentOverrides[n.id] : n.parent_id,
  }));
  const childParentIds = new Set(withOverrides.map((n) => n.parent_id).filter(Boolean));
  const customFolders = new Set(custom.filter((c) => c.kind === "folder").map((c) => c.id));
  const byId = new Map(withOverrides.map((n) => [n.id, n]));
  const depthOf = (node: Node): number => {
    let d = 0;
    let cur: Node | undefined = node;
    let guard = 0;
    while (cur?.parent_id && guard++ < 50) {
      cur = byId.get(cur.parent_id);
      if (!cur) break;
      d++;
    }
    return d;
  };
  return withOverrides.map((n) => ({
    ...n,
    depth: depthOf(n),
    has_children: n.has_children || childParentIds.has(n.id) || customFolders.has(n.id),
  }));
}

const MEMOS_KEY = "terminal.memos.v1";
const PHOTOS_KEY = "terminal.photos.v1";
const PDFS_KEY = "terminal.pdfs.v1";
const VIDEOS_KEY = "terminal.videos.v1";
const BANNERS_KEY = "terminal.banners.v1";
const MIGRATED_KEY = "terminal.migrated.v1";
const LAST_BACKUP_KEY = "terminal.lastBackup.v1";
const PHOTO_DIR = FileSystem.documentDirectory + "photos/";
const VIDEO_DIR = FileSystem.documentDirectory + "videos/";
const IS_NATIVE = !!FileSystem.documentDirectory;

type PhotoRef = { id: string; uri: string; caption?: string; created_at?: string };
type PhotoStore = Record<string, PhotoRef[]>;

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
// Reject ids that could escape the storage directory when used in file paths.
const SAFE_ID = /^[A-Za-z0-9_-]+$/;
function isSafeId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 128 && SAFE_ID.test(id);
}
function nowIso(): string {
  return new Date().toISOString();
}
function stripDataUri(data: string): string {
  return data.includes(",") ? data.split(",")[1] : data;
}

async function readMemos(): Promise<Memo[]> {
  const raw = await AsyncStorage.getItem(MEMOS_KEY);
  return raw ? (JSON.parse(raw) as Memo[]) : [];
}
async function writeMemos(memos: Memo[]): Promise<void> {
  await AsyncStorage.setItem(MEMOS_KEY, JSON.stringify(memos));
}
async function readPhotos(): Promise<PhotoStore> {
  const raw = await AsyncStorage.getItem(PHOTOS_KEY);
  return raw ? (JSON.parse(raw) as PhotoStore) : {};
}
async function writePhotos(store: PhotoStore): Promise<void> {
  await AsyncStorage.setItem(PHOTOS_KEY, JSON.stringify(store));
}

type PdfRef = { id: string; uri: string; filename: string; caption?: string; created_at?: string };
type PdfStore = Record<string, PdfRef[]>;
async function readPdfs(): Promise<PdfStore> {
  const raw = await AsyncStorage.getItem(PDFS_KEY);
  return raw ? (JSON.parse(raw) as PdfStore) : {};
}
async function writePdfs(store: PdfStore): Promise<void> {
  await AsyncStorage.setItem(PDFS_KEY, JSON.stringify(store));
}

type VideoRef = { id: string; uri: string; caption?: string; created_at?: string };
type VideoStore = Record<string, VideoRef[]>;
async function readVideos(): Promise<VideoStore> {
  const raw = await AsyncStorage.getItem(VIDEOS_KEY);
  return raw ? (JSON.parse(raw) as VideoStore) : {};
}
async function writeVideos(store: VideoStore): Promise<void> {
  await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(store));
}

type BannerState = { uri?: string; hidden?: boolean; created_at?: string };
type BannerStore = Record<string, BannerState>;
async function readBanners(): Promise<BannerStore> {
  const raw = await AsyncStorage.getItem(BANNERS_KEY);
  return raw ? (JSON.parse(raw) as BannerStore) : {};
}
async function writeBanners(store: BannerStore): Promise<void> {
  await AsyncStorage.setItem(BANNERS_KEY, JSON.stringify(store));
}
async function resolveUri(uri: string): Promise<string | null> {
  if (uri.startsWith("idb://")) return await getImage(uri.slice("idb://".length));
  return uri;
}
async function removeStored(uri?: string): Promise<void> {
  if (!uri) return;
  try {
    if (uri.startsWith("idb://")) await deleteImage(uri.slice("idb://".length));
    else if (uri.startsWith("file")) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* ignore */
  }
}
async function ensureDir(): Promise<void> {
  if (!IS_NATIVE) return;
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
}
async function ensureVideoDir(): Promise<void> {
  if (!IS_NATIVE) return;
  const info = await FileSystem.getInfoAsync(VIDEO_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(VIDEO_DIR, { intermediates: true });
}
function byNewest(a: Memo, b: Memo): number {
  return b.created_at.localeCompare(a.created_at);
}

export const api = {
  getTree: async (): Promise<Node[]> => await getAllNodes(),

  getNode: async (id: string): Promise<NodeDetail> => {
    const all = await getAllNodes();
    const byId = new Map(all.map((n) => [n.id, n]));
    const node = byId.get(id);
    if (!node) throw new Error("Locatie niet gevonden");
    const children = all.filter((n) => n.parent_id === id).sort((a, b) => a.order - b.order);
    const breadcrumb: { id: string; name: string }[] = [];
    let cur: Node | undefined = node;
    while (cur) {
      breadcrumb.unshift({ id: cur.id, name: cur.name });
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    return { ...node, children, breadcrumb };
  },

  addNode: async (
    parentId: string | null,
    name: string,
    kind: "folder" | "page",
  ): Promise<Node> => {
    const all = await getAllNodes();
    const parent = parentId ? all.find((n) => n.id === parentId) : null;
    const depth = parent ? parent.depth + 1 : 0;
    const siblings = all.filter((n) => n.parent_id === parentId);
    const order = siblings.length ? Math.max(...siblings.map((s) => s.order)) + 1 : 0;
    const node: CustomNode = {
      id: `c-${uid()}`,
      name: name.trim(),
      parent_id: parentId,
      order,
      depth,
      kind,
    };
    const custom = await readCustomNodes();
    custom.push(node);
    await writeCustomNodes(custom);
    return {
      id: node.id,
      name: node.name,
      parent_id: parentId,
      order,
      depth,
      has_children: kind === "folder",
      is_plattegrond: false,
    };
  },

  renameNode: async (id: string, name: string): Promise<{ ok: boolean }> => {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false };
    const custom = await readCustomNodes();
    const idx = custom.findIndex((c) => c.id === id);
    if (idx >= 0) {
      custom[idx] = { ...custom[idx], name: trimmed };
      await writeCustomNodes(custom);
    } else {
      const renames = await readRenames();
      renames[id] = trimmed;
      await writeRenames(renames);
    }
    return { ok: true };
  },

  reorderNode: async (id: string, direction: "up" | "down"): Promise<{ ok: boolean }> => {
    const all = await getAllNodes();
    const target = all.find((n) => n.id === id);
    if (!target) return { ok: false };
    const siblings = all
      .filter((n) => n.parent_id === target.parent_id)
      .sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((n) => n.id === id);
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= siblings.length) return { ok: false };
    const reordered = [...siblings];
    [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];
    const orders = await readOrders();
    reordered.forEach((s, i) => {
      orders[s.id] = i;
    });
    await writeOrders(orders);
    return { ok: true };
  },

  moveNode: async (id: string, newParentId: string | null): Promise<{ ok: boolean }> => {
    const all = await getAllNodes();
    const node = all.find((n) => n.id === id);
    if (!node) return { ok: false };
    if (newParentId === id) return { ok: false };
    // A node may not be moved into itself or one of its own descendants.
    const descendants = new Set<string>();
    const collect = (nid: string) => {
      descendants.add(nid);
      all.filter((n) => n.parent_id === nid).forEach((c) => collect(c.id));
    };
    collect(id);
    if (newParentId !== null && descendants.has(newParentId)) return { ok: false };
    if (node.parent_id === newParentId) return { ok: true };

    const parents = await readParents();
    const custom = await readCustomNodes();
    const cidx = custom.findIndex((c) => c.id === id);
    if (cidx >= 0) {
      custom[cidx] = { ...custom[cidx], parent_id: newParentId };
      await writeCustomNodes(custom);
      if (id in parents) {
        delete parents[id];
        await writeParents(parents);
      }
    } else {
      parents[id] = newParentId;
      await writeParents(parents);
    }
    // Drop the moved node to the end of its new siblings.
    const siblings = all.filter((n) => n.parent_id === newParentId && n.id !== id);
    const maxOrder = siblings.length ? Math.max(...siblings.map((s) => s.order)) : -1;
    const orders = await readOrders();
    orders[id] = maxOrder + 1;
    await writeOrders(orders);
    return { ok: true };
  },

  deleteNode: async (id: string): Promise<{ ok: boolean }> => {
    const all = await getAllNodes();
    // Collect the node and every descendant so nested pages/folders go too.
    const toDelete = new Set<string>();
    const collect = (nid: string) => {
      toDelete.add(nid);
      all.filter((n) => n.parent_id === nid).forEach((c) => collect(c.id));
    };
    collect(id);
    const ids = [...toDelete];

    // Clean up any media/memos attached to the removed nodes.
    const [photos, pdfs, videos, banners] = await Promise.all([
      readPhotos(),
      readPdfs(),
      readVideos(),
      readBanners(),
    ]);
    for (const nid of ids) {
      for (const p of photos[nid] ?? []) await removeStored(p.uri);
      delete photos[nid];
      for (const p of pdfs[nid] ?? []) await removeStored(p.uri);
      delete pdfs[nid];
      for (const v of videos[nid] ?? []) await removeStored(v.uri);
      delete videos[nid];
      if (banners[nid]) {
        await removeStored(banners[nid].uri);
        delete banners[nid];
      }
    }
    await Promise.all([
      writePhotos(photos),
      writePdfs(pdfs),
      writeVideos(videos),
      writeBanners(banners),
    ]);

    const memos = await readMemos();
    await writeMemos(memos.filter((m) => !toDelete.has(m.node_id)));

    // Custom nodes are removed outright; bundled (BASE) nodes are marked hidden.
    const custom = await readCustomNodes();
    await writeCustomNodes(custom.filter((c) => !toDelete.has(c.id)));
    const baseToDelete = ids.filter((nid) => BASE.some((b) => b.id === nid));
    if (baseToDelete.length) {
      const deleted = await readDeleted();
      await writeDeleted([...new Set([...deleted, ...baseToDelete])]);
    }
    const renames = await readRenames();
    let renamesChanged = false;
    for (const nid of ids) {
      if (renames[nid] !== undefined) {
        delete renames[nid];
        renamesChanged = true;
      }
    }
    if (renamesChanged) await writeRenames(renames);

    const orders = await readOrders();
    let ordersChanged = false;
    for (const nid of ids) {
      if (orders[nid] !== undefined) {
        delete orders[nid];
        ordersChanged = true;
      }
    }
    if (ordersChanged) await writeOrders(orders);

    const parents = await readParents();
    let parentsChanged = false;
    for (const nid of ids) {
      if (nid in parents) {
        delete parents[nid];
        parentsChanged = true;
      }
    }
    if (parentsChanged) await writeParents(parents);

    return { ok: true };
  },

  // ------- Photos -------
  getContent: async (id: string): Promise<Content> => {
    const store = await readPhotos();
    const list = store[id] ?? [];
    const photos = await Promise.all(
      list.map(async (p) => {
        let data = p.uri;
        if (p.uri.startsWith("idb://")) data = (await getImage(p.id)) ?? "";
        return { id: p.id, data, caption: p.caption ?? "", created_at: p.created_at };
      }),
    );
    return { node_id: id, photos };
  },
  addPhoto: async (id: string, data: string, caption = ""): Promise<Photo> => {
    const pid = uid();
    const created_at = nowIso();
    let refUri: string;
    let displayData: string;
    if (IS_NATIVE) {
      await ensureDir();
      refUri = `${PHOTO_DIR}${pid}.jpg`;
      await FileSystem.writeAsStringAsync(refUri, stripDataUri(data), {
        encoding: FileSystem.EncodingType.Base64,
      });
      displayData = refUri;
    } else {
      // Web preview: store large image data in IndexedDB, not AsyncStorage.
      displayData = data.startsWith("data:") ? data : `data:image/jpeg;base64,${data}`;
      await putImage(pid, displayData);
      refUri = `idb://${pid}`;
    }
    const store = await readPhotos();
    store[id] = [...(store[id] ?? []), { id: pid, uri: refUri, caption, created_at }];
    await writePhotos(store);
    return { id: pid, data: displayData, caption, created_at };
  },
  updateCaption: async (id: string, photoId: string, caption: string): Promise<{ ok: boolean }> => {
    const store = await readPhotos();
    const list = store[id] ?? [];
    store[id] = list.map((p) => (p.id === photoId ? { ...p, caption } : p));
    await writePhotos(store);
    return { ok: true };
  },
  deletePhoto: async (id: string, photoId: string): Promise<{ ok: boolean }> => {
    const store = await readPhotos();
    const list = store[id] ?? [];
    const target = list.find((p) => p.id === photoId);
    if (target) {
      try {
        if (target.uri.startsWith("idb://")) {
          await deleteImage(target.id);
        } else if (target.uri.startsWith("file")) {
          await FileSystem.deleteAsync(target.uri, { idempotent: true });
        }
      } catch {
        /* ignore */
      }
    }
    store[id] = list.filter((p) => p.id !== photoId);
    await writePhotos(store);
    return { ok: true };
  },

  // ------- PDFs -------
  getPdfs: async (id: string): Promise<Pdf[]> => {
    const store = await readPdfs();
    const list = store[id] ?? [];
    return await Promise.all(
      list.map(async (p) => {
        let data = p.uri;
        if (p.uri.startsWith("idb://")) data = (await getImage(p.id)) ?? "";
        else if (p.uri.startsWith("file")) data = p.uri;
        return {
          id: p.id,
          data,
          filename: p.filename,
          caption: p.caption ?? "",
          created_at: p.created_at,
        };
      }),
    );
  },
  addPdf: async (id: string, dataUri: string, filename: string, caption = ""): Promise<Pdf> => {
    const pid = uid();
    const created_at = nowIso();
    let uri: string;
    if (IS_NATIVE) {
      await ensureDir();
      uri = `${PHOTO_DIR}${pid}.pdf`;
      await FileSystem.writeAsStringAsync(uri, stripDataUri(dataUri), {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      const full = dataUri.startsWith("data:") ? dataUri : `data:application/pdf;base64,${dataUri}`;
      await putImage(pid, full);
      uri = `idb://${pid}`;
    }
    const store = await readPdfs();
    store[id] = [...(store[id] ?? []), { id: pid, uri, filename, caption, created_at }];
    await writePdfs(store);
    const data = IS_NATIVE ? uri : dataUri;
    return { id: pid, data, filename, caption, created_at };
  },
  deletePdf: async (id: string, pdfId: string): Promise<{ ok: boolean }> => {
    const store = await readPdfs();
    const list = store[id] ?? [];
    const target = list.find((p) => p.id === pdfId);
    if (target) await removeStored(target.uri);
    store[id] = list.filter((p) => p.id !== pdfId);
    await writePdfs(store);
    return { ok: true };
  },

  // ------- Videos (stored locally, NOT included in back-up) -------
  getVideos: async (id: string): Promise<Video[]> => {
    const store = await readVideos();
    const list = store[id] ?? [];
    return await Promise.all(
      list.map(async (v) => {
        let uri = v.uri;
        if (uri.startsWith("idb://")) {
          const blob = await getImage(v.id);
          uri = blob ? URL.createObjectURL(blob) : "";
        }
        return { id: v.id, uri, caption: v.caption ?? "", created_at: v.created_at };
      }),
    );
  },
  addVideo: async (id: string, srcUri: string, caption = ""): Promise<Video> => {
    const vid = uid();
    const created_at = nowIso();
    let uri = srcUri;
    if (IS_NATIVE) {
      await ensureVideoDir();
      const dest = `${VIDEO_DIR}${vid}.mp4`;
      try {
        await FileSystem.copyAsync({ from: srcUri, to: dest });
        uri = dest;
      } catch {
        uri = srcUri;
      }
    } else {
      // Web: persist the video blob in IndexedDB so it survives reloads.
      const blob = await (await fetch(srcUri)).blob();
      await putImage(vid, blob);
      uri = `idb://${vid}`;
    }
    const store = await readVideos();
    store[id] = [...(store[id] ?? []), { id: vid, uri, caption, created_at }];
    await writeVideos(store);
    return { id: vid, uri: IS_NATIVE ? uri : srcUri, caption, created_at };
  },
  deleteVideo: async (id: string, videoId: string): Promise<{ ok: boolean }> => {
    const store = await readVideos();
    const list = store[id] ?? [];
    const target = list.find((v) => v.id === videoId);
    if (target) await removeStored(target.uri);
    store[id] = list.filter((v) => v.id !== videoId);
    await writeVideos(store);
    return { ok: true };
  },

  // ------- Memos -------
  getMemos: async (id: string): Promise<Memo[]> => {
    const all = await readMemos();
    return all.filter((m) => m.node_id === id).sort(byNewest);
  },
  createMemo: async (id: string, text: string): Promise<Memo> => {
    const nodes = await getAllNodes();
    const node = nodes.find((n) => n.id === id);
    const memo: Memo = {
      id: uid(),
      node_id: id,
      node_name: node?.name ?? id,
      text,
      created_at: nowIso(),
    };
    const all = await readMemos();
    all.push(memo);
    await writeMemos(all);
    return memo;
  },
  deleteMemo: async (memoId: string): Promise<{ ok: boolean }> => {
    const all = await readMemos();
    await writeMemos(all.filter((m) => m.id !== memoId));
    return { ok: true };
  },
  updateMemo: async (memoId: string, text: string): Promise<Memo> => {
    const all = await readMemos();
    const updated = all.map((m) =>
      m.id === memoId ? { ...m, text, updated_at: nowIso() } : m,
    );
    await writeMemos(updated);
    return updated.find((m) => m.id === memoId) as Memo;
  },
  getRecentMemos: async (limit = 5): Promise<Memo[]> => {
    const all = await readMemos();
    const nodes = await getAllNodes();
    const known = new Set(nodes.map((n) => n.id));
    // Only surface memos whose location still exists in the tree — this keeps
    // the home ticker free of "orphaned" memos from folders removed in updates.
    return all
      .filter((m) => known.has(m.node_id))
      .sort(byNewest)
      .slice(0, limit);
  },

  // ------- Search (local) -------
  search: async (q: string): Promise<(Node & { match: string })[]> => {
    const query = q.toLowerCase();
    const nodes = await getAllNodes();
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const matchById = new Map<string, string>();
    // 1) Location names
    for (const n of nodes) {
      if (n.name.toLowerCase().includes(query)) matchById.set(n.id, "naam");
    }
    // 2) Memo text
    const memos = await readMemos();
    for (const m of memos) {
      if (!matchById.has(m.node_id) && byId.has(m.node_id) && m.text.toLowerCase().includes(query)) {
        matchById.set(m.node_id, "memo");
      }
    }
    // 3) Photo captions
    const photos = await readPhotos();
    for (const [nodeId, list] of Object.entries(photos)) {
      if (matchById.has(nodeId) || !byId.has(nodeId)) continue;
      if (list.some((p) => (p.caption ?? "").toLowerCase().includes(query))) {
        matchById.set(nodeId, "foto");
      }
    }
    // 4) PDF filenames + captions
    const pdfs = await readPdfs();
    for (const [nodeId, list] of Object.entries(pdfs)) {
      if (matchById.has(nodeId) || !byId.has(nodeId)) continue;
      if (
        list.some(
          (p) =>
            (p.filename ?? "").toLowerCase().includes(query) ||
            (p.caption ?? "").toLowerCase().includes(query),
        )
      ) {
        matchById.set(nodeId, "pdf");
      }
    }
    return [...matchById.entries()].map(([id, match]) => ({ ...(byId.get(id) as Node), match }));
  },

  // ------- Page banners (voorbladfoto's) -------
  getBanner: async (nodeId: string): Promise<{ data: string | null; hidden: boolean }> => {
    const banners = await readBanners();
    const st = banners[nodeId];
    if (!st) return { data: null, hidden: false };
    if (st.hidden) return { data: null, hidden: true };
    const data = st.uri ? await resolveUri(st.uri) : null;
    return { data, hidden: false };
  },
  setBanner: async (nodeId: string, data: string): Promise<{ ok: boolean }> => {
    const banners = await readBanners();
    await removeStored(banners[nodeId]?.uri);
    const bid = `banner-${nodeId}`;
    let uri: string;
    if (IS_NATIVE) {
      await ensureDir();
      uri = `${PHOTO_DIR}${bid}.jpg`;
      await FileSystem.writeAsStringAsync(uri, stripDataUri(data), {
        encoding: FileSystem.EncodingType.Base64,
      });
    } else {
      const dataUri = data.startsWith("data:") ? data : `data:image/jpeg;base64,${data}`;
      await putImage(bid, dataUri);
      uri = `idb://${bid}`;
    }
    banners[nodeId] = { uri, hidden: false, created_at: nowIso() };
    await writeBanners(banners);
    return { ok: true };
  },
  deleteBanner: async (nodeId: string): Promise<{ ok: boolean }> => {
    const banners = await readBanners();
    await removeStored(banners[nodeId]?.uri);
    banners[nodeId] = { hidden: true };
    await writeBanners(banners);
    return { ok: true };
  },

  // ------- Wipe all user data (memos + photos + captions) -------
  clearAllData: async (): Promise<{ ok: boolean }> => {
    const store = await readPhotos();
    for (const list of Object.values(store)) {
      for (const p of list) await removeStored(p.uri);
    }
    const pdfs = await readPdfs();
    for (const list of Object.values(pdfs)) {
      for (const p of list) await removeStored(p.uri);
    }
    const videos = await readVideos();
    for (const list of Object.values(videos)) {
      for (const v of list) await removeStored(v.uri);
    }
    await AsyncStorage.multiRemove([MEMOS_KEY, PHOTOS_KEY, PDFS_KEY, VIDEOS_KEY]);
    return { ok: true };
  },

  // ------- Backup / export & import -------
  exportData: async (includeVideos = false): Promise<boolean> => {
    const memos = await readMemos();
    const store = await readPhotos();
    const photos: {
      node_id: string;
      id: string;
      data: string;
      caption: string;
      created_at?: string;
    }[] = [];
    for (const [nodeId, list] of Object.entries(store)) {
      for (const p of list) {
        try {
          if (p.uri.startsWith("data:")) {
            photos.push({
              node_id: nodeId,
              id: p.id,
              data: p.uri,
              caption: p.caption ?? "",
              created_at: p.created_at,
            });
          } else if (p.uri.startsWith("idb://")) {
            const d = await getImage(p.id);
            if (d) {
              photos.push({
                node_id: nodeId,
                id: p.id,
                data: d,
                caption: p.caption ?? "",
                created_at: p.created_at,
              });
            }
          } else {
            const b64 = await FileSystem.readAsStringAsync(p.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            photos.push({
              node_id: nodeId,
              id: p.id,
              data: `data:image/jpeg;base64,${b64}`,
              caption: p.caption ?? "",
              created_at: p.created_at,
            });
          }
        } catch {
          /* skip missing file */
        }
      }
    }
    const pdfStore = await readPdfs();
    const pdfs: {
      node_id: string;
      id: string;
      data: string;
      filename: string;
      caption: string;
      created_at?: string;
    }[] = [];
    for (const [nodeId, list] of Object.entries(pdfStore)) {
      for (const p of list) {
        try {
          let data: string | null = null;
          if (p.uri.startsWith("data:")) data = p.uri;
          else if (p.uri.startsWith("idb://")) data = await getImage(p.id);
          else {
            const b64 = await FileSystem.readAsStringAsync(p.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            data = `data:application/pdf;base64,${b64}`;
          }
          if (data) {
            pdfs.push({
              node_id: nodeId,
              id: p.id,
              data,
              filename: p.filename,
              caption: p.caption ?? "",
              created_at: p.created_at,
            });
          }
        } catch {
          /* skip missing file */
        }
      }
    }
    // Folder structure (custom nodes + overrides) so a restore rebuilds the tree.
    const [customNodes, renames, orders, parentOverrides, deleted] = await Promise.all([
      readCustomNodes(),
      readRenames(),
      readOrders(),
      readParents(),
      readDeleted(),
    ]);
    // Page banners (voorbladfoto's) as inline base64 so they travel with the file.
    const bannerStore = await readBanners();
    const banners: Record<string, { data?: string; hidden?: boolean; created_at?: string }> = {};
    for (const [nodeId, st] of Object.entries(bannerStore)) {
      if (st.hidden) {
        banners[nodeId] = { hidden: true };
        continue;
      }
      if (!st.uri) continue;
      try {
        let data: string | null = null;
        if (st.uri.startsWith("data:")) data = st.uri;
        else if (st.uri.startsWith("idb://")) data = await getImage(st.uri.slice("idb://".length));
        else {
          const b64 = await FileSystem.readAsStringAsync(st.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          data = `data:image/jpeg;base64,${b64}`;
        }
        if (data) banners[nodeId] = { data, created_at: st.created_at };
      } catch {
        /* skip missing banner file */
      }
    }
    // Videos are only included when the user opts in (files can be large).
    const videos: {
      node_id: string;
      id: string;
      data: string;
      caption: string;
      created_at?: string;
    }[] = [];
    if (includeVideos) {
      const videoStore = await readVideos();
      for (const [nodeId, list] of Object.entries(videoStore)) {
        for (const v of list) {
          try {
            if (v.uri.startsWith("data:")) {
              videos.push({
                node_id: nodeId,
                id: v.id,
                data: v.uri,
                caption: v.caption ?? "",
                created_at: v.created_at,
              });
            } else if (v.uri.startsWith("idb://")) {
              const blob: Blob | null = await getImage(v.id);
              if (blob) {
                const data = await new Promise<string>((resolve, reject) => {
                  const r = new FileReader();
                  r.onloadend = () => resolve(r.result as string);
                  r.onerror = () => reject(r.error);
                  r.readAsDataURL(blob);
                });
                videos.push({ node_id: nodeId, id: v.id, data, caption: v.caption ?? "", created_at: v.created_at });
              }
            } else if (v.uri.startsWith("file")) {
              const b64 = await FileSystem.readAsStringAsync(v.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              videos.push({
                node_id: nodeId,
                id: v.id,
                data: `data:video/mp4;base64,${b64}`,
                caption: v.caption ?? "",
                created_at: v.created_at,
              });
            }
            // blob: URIs (web session) can't be re-read reliably — skip.
          } catch {
            /* skip missing video file */
          }
        }
      }
    }
    const bundle = {
      app: "terminal-referentie",
      version: 2,
      exported_at: nowIso(),
      memos,
      photos,
      pdfs,
      structure: { customNodes, renames, orders, parents: parentOverrides, deleted },
      banners,
      videos,
    };
    const stamp = new Date().toISOString().slice(0, 10);
    if (!IS_NATIVE) {
      // Web: download the backup as a .json file.
      const url = URL.createObjectURL(new Blob([JSON.stringify(bundle)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `terminal-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      await AsyncStorage.setItem(LAST_BACKUP_KEY, nowIso());
      return true;
    }
    const fileUri = `${FileSystem.cacheDirectory}terminal-backup-${stamp}.json`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(bundle));
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Back-up delen of opslaan",
        UTI: "public.json",
      });
      await AsyncStorage.setItem(LAST_BACKUP_KEY, nowIso());
      return true;
    }
    return false;
  },

  getLastBackup: async (): Promise<string | null> => {
    return await AsyncStorage.getItem(LAST_BACKUP_KEY);
  },

  importData: async (): Promise<{ memos: number; photos: number } | null> => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "public.json", "*/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.length) return null;
    const raw = IS_NATIVE
      ? await FileSystem.readAsStringAsync(res.assets[0].uri)
      : await (await fetch(res.assets[0].uri)).text();
    const bundle = JSON.parse(raw);
    if (!bundle || !Array.isArray(bundle.memos)) {
      throw new Error("Ongeldig back-upbestand");
    }
    await writeMemos(bundle.memos as Memo[]);

    await ensureDir();
    const store: PhotoStore = {};
    const photos = Array.isArray(bundle.photos) ? bundle.photos : [];
    for (const ph of photos) {
      if (!isSafeId(ph.id) || !isSafeId(ph.node_id)) continue;
      let uri: string;
      if (IS_NATIVE) {
        uri = `${PHOTO_DIR}${ph.id}.jpg`;
        await FileSystem.writeAsStringAsync(uri, stripDataUri(ph.data), {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        const dataUri = ph.data.startsWith("data:")
          ? ph.data
          : `data:image/jpeg;base64,${ph.data}`;
        await putImage(ph.id, dataUri);
        uri = `idb://${ph.id}`;
      }
      store[ph.node_id] = [
        ...(store[ph.node_id] ?? []),
        { id: ph.id, uri, caption: ph.caption ?? "", created_at: ph.created_at },
      ];
    }
    await writePhotos(store);

    const pdfStore: PdfStore = {};
    const pdfs = Array.isArray(bundle.pdfs) ? bundle.pdfs : [];
    for (const pd of pdfs) {
      if (!isSafeId(pd.id) || !isSafeId(pd.node_id)) continue;
      let uri: string;
      if (IS_NATIVE) {
        uri = `${PHOTO_DIR}${pd.id}.pdf`;
        await FileSystem.writeAsStringAsync(uri, stripDataUri(pd.data), {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        const dataUri = pd.data.startsWith("data:")
          ? pd.data
          : `data:application/pdf;base64,${pd.data}`;
        await putImage(pd.id, dataUri);
        uri = `idb://${pd.id}`;
      }
      pdfStore[pd.node_id] = [
        ...(pdfStore[pd.node_id] ?? []),
        {
          id: pd.id,
          uri,
          filename: pd.filename ?? "document.pdf",
          caption: pd.caption ?? "",
          created_at: pd.created_at,
        },
      ];
    }
    await writePdfs(pdfStore);

    // Restore the folder structure (custom nodes + overrides), if present.
    if (bundle.structure) {
      await writeCustomNodes(bundle.structure.customNodes ?? []);
      await writeRenames(bundle.structure.renames ?? {});
      await writeOrders(bundle.structure.orders ?? {});
      await writeParents(bundle.structure.parents ?? {});
      await writeDeleted(bundle.structure.deleted ?? []);
    }

    // Restore page banners (voorbladfoto's), if present.
    if (bundle.banners && typeof bundle.banners === "object") {
      const bannerStore: BannerStore = {};
      for (const [nodeId, b] of Object.entries(
        bundle.banners as Record<string, { data?: string; hidden?: boolean; created_at?: string }>,
      )) {
        if (!isSafeId(nodeId)) continue;
        if (b.hidden) {
          bannerStore[nodeId] = { hidden: true };
          continue;
        }
        if (!b.data) continue;
        const bid = `banner-${nodeId}`;
        let uri: string;
        if (IS_NATIVE) {
          uri = `${PHOTO_DIR}${bid}.jpg`;
          await FileSystem.writeAsStringAsync(uri, stripDataUri(b.data), {
            encoding: FileSystem.EncodingType.Base64,
          });
        } else {
          const dataUri = b.data.startsWith("data:") ? b.data : `data:image/jpeg;base64,${b.data}`;
          await putImage(bid, dataUri);
          uri = `idb://${bid}`;
        }
        bannerStore[nodeId] = { uri, hidden: false, created_at: b.created_at };
      }
      await writeBanners(bannerStore);
    }

    // Restore videos, if present in the bundle (opt-in export).
    if (Array.isArray(bundle.videos) && bundle.videos.length) {
      await ensureVideoDir();
      const videoStore: VideoStore = {};
      for (const v of bundle.videos) {
        if (!isSafeId(v.id) || !isSafeId(v.node_id)) continue;
        let uri: string;
        if (IS_NATIVE) {
          uri = `${VIDEO_DIR}${v.id}.mp4`;
          await FileSystem.writeAsStringAsync(uri, stripDataUri(v.data), {
            encoding: FileSystem.EncodingType.Base64,
          });
        } else {
          uri = v.data.startsWith("data:") ? v.data : `data:video/mp4;base64,${v.data}`;
        }
        videoStore[v.node_id] = [
          ...(videoStore[v.node_id] ?? []),
          { id: v.id, uri, caption: v.caption ?? "", created_at: v.created_at },
        ];
      }
      await writeVideos(videoStore);
    }

    return { memos: bundle.memos.length, photos: photos.length };
  },

  // ------- Migration (retired) -------
  // The app is now fully offline and the backend data API has been disabled.
  // This is kept as a no-op so callers don't break; it performs no network I/O.
  migrateOnce: async (): Promise<void> => {
    await AsyncStorage.setItem(MIGRATED_KEY, "1");
  },
};
