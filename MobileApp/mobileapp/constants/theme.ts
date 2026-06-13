import { Platform } from 'react-native';

// ─── Color Palette ───────────────────────────────────────────────────────────

export const Colors = {
  light: {
    text: '#11181C',
    textSecondary: '#687076',
    background: '#F2F3F5',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E1E3E6',
    accent: '#0a7ea4',
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    background: '#151718',
    backgroundElement: '#1E2022',
    backgroundSelected: '#2C2F31',
    accent: '#3c87f7',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};

// ─── ThemeColor ───────────────────────────────────────────────────────────────
// Union of all color keys — used to type `type` prop on ThemedView and ThemedText

export type ThemeColor = keyof typeof Colors.dark & keyof typeof Colors.light;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const Spacing = {
  half: 4,
  one: 8,
  two: 12,
  three: 16,
  four: 20,
  five: 24,
  six: 32,
} as const;

// ─── Layout ───────────────────────────────────────────────────────────────────

/** Height reserved for the native bottom tab bar */
export const BottomTabInset = 49;

/** Max width of scrollable content (for large screens / web) */
export const MaxContentWidth = 680;

// ─── Typography ───────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
