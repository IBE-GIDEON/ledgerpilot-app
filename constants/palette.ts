export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeMode = 'light' | 'dark';

export type AppPalette = {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  text: string;
  muted: string;
  sky: string;
  mint: string;
  amber: string;
  coral: string;
  lavender: string;
  rose: string;
  shadow: string;
  ink: string;
  inkCard: string;
  inkSoft: string;
  paper: string;
  canvas: string;
  butter: string;
  butterSoft: string;
  smoke: string;
  smokeDark: string;
  textOnDark: string;
  mutedOnDark: string;
  success: string;
  blue: string;
  orange: string;
};

// Legacy palette kept for any remaining older components; mirrors constants/theme.ts.
export const darkPalette: AppPalette = {
  background: '#0B0B0C',
  backgroundAlt: '#1C1C1E',
  surface: '#1C1C1E',
  surfaceAlt: '#2A2A2D',
  surfaceRaised: '#2A2A2D',
  border: '#2C2C2F',
  borderStrong: '#3A3A3E',
  text: '#FFFFFF',
  muted: '#9B9BA1',
  sky: '#3B82F6',
  mint: '#22C55E',
  amber: '#FFC83D',
  coral: '#F4555A',
  lavender: '#7B3FF2',
  rose: '#EC4899',
  shadow: 'rgba(0, 0, 0, 0.4)',
  ink: '#0B0B0C',
  inkCard: '#1C1C1E',
  inkSoft: '#2A2A2D',
  paper: '#1C1C1E',
  canvas: '#0B0B0C',
  butter: '#FFFFFF',
  butterSoft: '#2A2A2D',
  smoke: '#2A2A2D',
  smokeDark: '#3A3A3E',
  textOnDark: '#FFFFFF',
  mutedOnDark: '#9B9BA1',
  success: '#34C77B',
  blue: '#3B82F6',
  orange: '#F97316',
};

export const lightPalette = darkPalette;

export const palette = lightPalette;

export const categoryColors: Record<string, string> = {
  Banking: '#3B82F6',
  Car: '#F97316',
  Contractors: '#14B8A6',
  Education: '#22C55E',
  Equipment: '#F4555A',
  Income: '#34C77B',
  Marketing: '#EC4899',
  Meals: '#FFC83D',
  Office: '#7B3FF2',
  Software: '#7B3FF2',
  Taxes: '#F4555A',
  Travel: '#3B82F6',
};

export const getPaletteForMode = (mode: ThemeMode) =>
  mode === 'dark' ? darkPalette : lightPalette;

export function getGlassShadow(colors: AppPalette) {
  return {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 0,
  };
}

export const glassShadow = getGlassShadow(lightPalette);
