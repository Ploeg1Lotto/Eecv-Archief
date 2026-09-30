import { useRef, useState } from "react";
import { Linking } from "react-native";

import { captureVideo, ensureCameraPermission, ensureLibraryPermission, pickVideo } from "./media";
import { PermissionSheet, PhotoSourceSheet } from "./permission-sheet";

/**
 * "Add video" flow: source chooser (Camera / Bibliotheek), contextual
 * permission requests and an "Open Settings" fallback. Returns the picked
 * video file uri to the callback.
 */
export function useVideoCapture() {
  const [sourceVisible, setSourceVisible] = useState(false);
  const [deniedSource, setDeniedSource] = useState<"camera" | "library" | null>(null);
  const callback = useRef<((uri: string) => void) | null>(null);

  const trigger = (onPicked: (uri: string) => void) => {
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
    const uri = source === "camera" ? await captureVideo() : await pickVideo();
    if (uri && callback.current) callback.current(uri);
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
        title={deniedSource === "camera" ? "Toegang tot camera nodig" : "Toegang tot media nodig"}
        message={
          deniedSource === "camera"
            ? "Geef toegang tot de camera om een video op te nemen."
            : "Geef toegang tot je media om een video toe te voegen."
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
