// Design tokens for "Terminal Referentie" — iOS-Native Clean, business/zakelijk.
export const colors = {
  surface: "#FFFFFF",
  onSurface: "#18181B",
  surfaceSecondary: "#F4F4F5",
  onSurfaceSecondary: "#3F3F46",
  surfaceTertiary: "#E4E4E7",
  onSurfaceTertiary: "#52525B",
  surfaceInverse: "#18181B",
  onSurfaceInverse: "#FFFFFF",
  brand: "#EA580C",
  brandPrimary: "#EA580C",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#C2410C",
  brandTertiary: "#FFEDD5",
  onBrandTertiary: "#9A3412",
  success: "#15803D",
  onSuccess: "#FFFFFF",
  warning: "#CA8A04",
  onWarning: "#FFFFFF",
  error: "#DC2626",
  onError: "#FFFFFF",
  border: "#E4E4E7",
  borderStrong: "#A1A1AA",
  divider: "#F4F4F5",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const font = {
  regular: "PlusJakarta-Regular",
  medium: "PlusJakarta-Medium",
  semibold: "PlusJakarta-SemiBold",
  bold: "PlusJakarta-Bold",
  extrabold: "PlusJakarta-ExtraBold",
};

export const type = {
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
};

export const images = {
  homeHero:
    "https://images.unsplash.com/photo-1670121180530-cfcba4438038?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwxfHxwb3J0JTIwY29udGFpbmVyJTIwdGVybWluYWx8ZW58MHx8fHwxNzg1MzY2NzcxfDA&ixlib=rb-4.1.0&q=85",
  plattegrondPlaceholder:
    "https://images.unsplash.com/photo-1721244654392-9c912a6eb236?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwYmx1ZXByaW50JTIwZmxvb3JwbGFufGVufDB8fHx8MTc4NTM2Njc3Mnww&ixlib=rb-4.1.0&q=85",
};

export const STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  open: { label: "Open", bg: "#FEE2E2", fg: "#B91C1C" },
  in_behandeling: { label: "In behandeling", bg: "#FEF3C7", fg: "#92400E" },
  opgelost: { label: "Opgelost", bg: "#DCFCE7", fg: "#166534" },
};
