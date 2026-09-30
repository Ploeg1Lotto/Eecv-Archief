// Load + edit the banner (voorbladfoto) for any node, right from its own page.
// A user-set custom banner overrides the bundled default; removing hides it.
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { api } from "./api";
import { usePhotoCapture } from "./use-photo-capture";

export type BannerSource = number | { uri: string } | null;

export function useBannerEditor(nodeId: string, defaultAsset?: number) {
  const photo = usePhotoCapture();
  const [state, setState] = useState<{ data: string | null; hidden: boolean }>({
    data: null,
    hidden: false,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      api.getBanner(nodeId).then((b) => {
        if (active) setState(b);
      });
      return () => {
        active = false;
      };
    }, [nodeId]),
  );

  const change = () => {
    photo.trigger(async (img) => {
      await api.setBanner(nodeId, img);
      const dataUri = img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`;
      setState({ data: dataUri, hidden: false });
    });
  };

  const remove = async () => {
    await api.deleteBanner(nodeId);
    setState({ data: null, hidden: true });
  };

  let source: BannerSource = null;
  if (state.data) source = { uri: state.data };
  else if (!state.hidden && defaultAsset) source = defaultAsset;

  return { source, hasImage: source != null, change, remove, element: photo.element };
}
