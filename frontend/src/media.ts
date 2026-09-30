import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export type PermResult = { granted: boolean; canAskAgain: boolean };

export async function ensureLibraryPermission(): Promise<PermResult> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.status === "granted") return { granted: true, canAskAgain: true };
  const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return { granted: req.status === "granted", canAskAgain: req.canAskAgain };
}

export async function ensureCameraPermission(): Promise<PermResult> {
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.status === "granted") return { granted: true, canAskAgain: true };
  const req = await ImagePicker.requestCameraPermissionsAsync();
  return { granted: req.status === "granted", canAskAgain: req.canAskAgain };
}

export async function captureImageBase64(): Promise<string | null> {
  const res = await ImagePicker.launchCameraAsync({
    quality: 0.6,
    base64: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  if (!asset.base64) return null;
  return `data:image/jpeg;base64,${asset.base64}`;
}

export async function captureVideo(): Promise<string | null> {
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ["videos"],
    quality: 0.6,
    videoMaxDuration: 120,
  });
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0].uri ?? null;
}

export async function pickVideo(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    quality: 0.6,
  });
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0].uri ?? null;
}

export async function pickImageBase64(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.6,
    base64: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  if (!asset.base64) return null;
  return `data:image/jpeg;base64,${asset.base64}`;
}

export async function pickPdfBase64(): Promise<{ data: string; filename: string } | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  const filename = asset.name ?? "document.pdf";
  if (FileSystem.documentDirectory) {
    const b64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { data: `data:application/pdf;base64,${b64}`, filename };
  }
  // Web: no FileSystem — read the picked file via fetch + FileReader.
  const blob = await (await fetch(asset.uri)).blob();
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { data, filename };
}

export async function writePdfToCache(pdf: { data: string; filename: string }): Promise<string> {
  const base64 = pdf.data.includes(",") ? pdf.data.split(",")[1] : pdf.data;
  const safeName = (pdf.filename.endsWith(".pdf") ? pdf.filename : `${pdf.filename}.pdf`).replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  );
  const fileUri = `${FileSystem.cacheDirectory}${safeName}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return fileUri;
}

function dataUriToBlob(data: string, fallbackType: string): Blob {
  const [head, b64] = data.includes(",") ? data.split(",") : ["", data];
  const type = /data:([^;]+)/.exec(head)?.[1] ?? fallbackType;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function openPdf(pdf: { data: string; filename: string }): Promise<void> {
  if (!FileSystem.documentDirectory) {
    // Web: open the PDF in a new browser tab.
    const url = URL.createObjectURL(dataUriToBlob(pdf.data, "application/pdf"));
    const w = window.open(url, "_blank");
    if (!w) window.location.href = url;
    return;
  }
  const fileUri = await writePdfToCache(pdf);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: pdf.filename,
    });
  }
}

/**
 * Share a photo (to Mail, WhatsApp, etc.) via the native share sheet.
 * Handles both file URIs (native) and base64 data URIs (web/imported).
 * Returns false when sharing is unavailable (e.g. web preview).
 */
export async function sharePhoto(uri: string, caption?: string): Promise<boolean> {
  if (!FileSystem.documentDirectory) return sharePhotoWeb(uri, caption);
  if (!(await Sharing.isAvailableAsync())) return false;
  let fileUri = uri;
  if (uri.startsWith("data:")) {
    const base64 = uri.includes(",") ? uri.split(",")[1] : uri;
    fileUri = `${FileSystem.cacheDirectory}foto-${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: "image/jpeg",
    UTI: "public.jpeg",
    dialogTitle: caption && caption.trim() ? caption.trim() : "Foto delen",
  });
  return true;
}

// Web: Web Share API with files, falling back to WhatsApp / mailto links.
async function sharePhotoWeb(uri: string, caption?: string): Promise<boolean> {
  const text = caption && caption.trim() ? caption.trim() : "Foto";
  const blob = uri.startsWith("data:") ? dataUriToBlob(uri, "image/jpeg") : await (await fetch(uri)).blob();
  const file = new File([blob], `foto-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
  const nav = navigator as any;
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: text, text });
    } catch {
      /* user cancelled */
    }
    return true;
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  const viaWhatsApp = window.confirm(
    "De foto is gedownload zodat je hem kunt bijvoegen.\n\nOK = delen via WhatsApp\nAnnuleren = delen via e-mail",
  );
  const link = viaWhatsApp
    ? `https://wa.me/?text=${encodeURIComponent(text)}`
    : `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(text)}`;
  window.open(link, "_blank");
  return true;
}
