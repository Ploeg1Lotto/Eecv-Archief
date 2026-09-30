import { useRef, useState } from "react";
import { Linking } from "react-native";

import {
  captureImageBase64,
  ensureCameraPermission,
  ensureLibraryPermission,
  pickImageBase64,
} from "./media";
import { PermissionSheet, PhotoSourceSheet } from "./permission-sheet";

/**
 * Encapsulates the "add photo" flow: a source chooser (Camera / Bibliotheek),
 * contextual permission requests, and a graceful "Open Settings" fallback when
 * permission is permanently denied.
 *
 * Usage:
 *   const photo = usePhotoCapture();
 *   ...
 *   <Pressable onPress={() => photo.trigger((base64) => setPhotos(...))} />
 *   {photo.element}
 */
export function usePhotoCapture() {
  const [sourceVisible, setSourceVisible] = useState(false);
  const [deniedSource, setDeniedSource] = useState<"camera" | "library" | null>(null);
  const callback = useRef<((base64: string) => void) | null>(null);

  const trigger = (onPicked: (base64: string) => void) => {
    callback.current = onPicked;
    setSourceVisible(true);
  };

  const choose = async (source: "camera" | "library") => {
    setSourceVisible(false);
    const perm =
      source === "camera" ? await ensureCameraPermission() : await ensureLibraryPermission();
    if (!perm.granted) {
      if (!perm.canAskAgain) setDeniedSource(source);
      return;
    }
    const img = source === "camera" ? await captureImageBase64() : await pickImageBase64();
    if (img && callback.current) callback.current(img);
  };

  const element = (
    <>
      <PhotoSourceSheet
        visible={sourceVisible}
        onClose={() => setSourceVisible(false)}
        onChoose={choose}
      />
      <PermissionSheet
        visible={deniedSource !== null}
        onClose={() => setDeniedSource(null)}
        title={deniedSource === "camera" ? "Toegang tot camera nodig" : "Toegang tot foto's nodig"}
        message={
          deniedSource === "camera"
            ? "Geef toegang tot de camera om een foto te maken."
            : "Geef toegang tot je foto's om een afbeelding toe te voegen."
        }
        onOpenSettings={() => {
          setDeniedSource(null);
          Linking.openSettings();
        }}
      />
    </>
  );

  return { trigger, element };
}
