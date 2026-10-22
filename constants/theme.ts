import { Platform } from 'react-native';

import type { ThemeMode } from '@/constants/palette';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  /** Main action fill: primary buttons, selected chips, progress. */
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primarySoft: string;
  /** Links, active icons, focus rings, switches. */
  tint: string;
  /** The raised feature card (Home wallet card, highlights). */
  hero: string;
  onHero: string;
  onHeroMuted: string;
  accent: string;
  accentSoft: string;
  positive: string;
  negative: string;
  warning: string;
  scrim: string;
};

// Lancer is dark only: black canvas, charcoal cards, white type, colour reserved for data.
const dark: ThemeColors = {
  background: '#0B0B0C',
  surface: '#1C1C1E',
  surfaceMuted: '#2A2A2D',
  border: '#2C2C2F',
  borderStrong: '#3A3A3E',
  text: '#FFFFFF',
  textMuted: '#9B9BA1',
  textFaint: '#6C6C72',
  primary: '#FFFFFF',
  primaryPressed: '#E2E2E4',
  onPrimary: '#0B0B0C',
  primarySoft: '#2A2A2D',
  tint: '#FFFFFF',
  hero: '#2A2A2D',
  onHero: '#FFFFFF',
  onHeroMuted: '#A1A1A7',
  accent: '#FFC83D',
  accentSoft: '#3A311A',
  positive: '#34C77B',
  negative: '#FF5A5F',
  warning: '#FFC83D',
  scrim: 'rgba(0, 0, 0, 0.55)',
};

/** Bright pops for charts, category dots and spending bars. */
export const dataColors = ['#7B3FF2', '#F4555A', '#22C55E', '#FFC83D', '#3B82F6', '#F97316', '#14B8A6', '#EC4899'] as const;

// The mode argument stays so callers don't change if a light theme returns.
export const getThemeColors = (_mode: ThemeMode) => dark;

export const fonts = {
  display: 'Urbanist_700Bold',
  displaySemibold: 'Urbanist_600SemiBold',
  sans: 'Urbanist_500Medium',
  sansMedium: 'Urbanist_600SemiBold',
  sansSemibold: 'Urbanist_700Bold',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 12,
  control: 14,
  card: 22,
  pill: 999,
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 36, lineHeight: 42, letterSpacing: -0.6 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24 },
  subheading: { fontFamily: fonts.sansSemibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 22 },
  bodyMedium: { fontFamily: fonts.sansMedium, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 19 },
  smallMedium: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.sansMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
} as const;

export const tabularNums = { fontVariant: ['tabular-nums' as const] };

export const hairline = Platform.select({ ios: 0.5, default: 1 }) as number;
