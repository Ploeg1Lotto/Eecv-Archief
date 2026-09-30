// Bundled default banner images shown at the top of certain pages.
// A user-set custom banner (stored locally) overrides these; deleting a banner
// hides it entirely. Keyed by node id.
export const DEFAULT_BANNERS: Record<string, number> = {
  zeekade: require("@/assets/images/zone-zeekade.jpg"),
  middenveld: require("@/assets/images/zone-middenveld.jpg"),
  binnenkade: require("@/assets/images/zone-binnenkade.webp"),
  tls: require("@/assets/images/zone-tls.webp"),
  "mentor-info": require("@/assets/images/zone-mentor-info.jpg"),
  "rijdend-materieel": require("@/assets/images/node-rijdend-materieel.jpg"),
};
