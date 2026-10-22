import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AppPalette,
  getPaletteForMode,
  ThemeMode,
  ThemePreference,
} from '@/constants/palette';
import { getThemeColors, ThemeColors } from '@/constants/theme';

const THEME_PREFERENCE_KEY = 'ledgerpilot-theme-preference';

type AppThemeContextValue = {
  colors: AppPalette;
  theme: ThemeColors;
  isDark: boolean;
  preference: ThemePreference;
  resolvedMode: ThemeMode;
  setPreference: (nextPreference: ThemePreference) => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | undefined>(undefined);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let active = true;

    const hydratePreference = async () => {
      const savedPreference = await SecureStore.getItemAsync(THEME_PREFERENCE_KEY);

      if (!active) {
        return;
      }

      if (
        savedPreference === 'system' ||
        savedPreference === 'light' ||
        savedPreference === 'dark'
      ) {
        setPreferenceState(savedPreference);
      }
    };

    void hydratePreference();

    return () => {
      active = false;
    };
  }, []);

  // Lancer ships one dark look; the stored preference is kept for a future light theme.
  const resolvedMode: ThemeMode = 'dark';

  const value = useMemo<AppThemeContextValue>(
    () => ({
      colors: getPaletteForMode(resolvedMode),
      theme: getThemeColors(resolvedMode),
      isDark: resolvedMode === 'dark',
      preference,
      resolvedMode,
      setPreference: async (nextPreference) => {
        setPreferenceState(nextPreference);
        await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, nextPreference);
      },
    }),
    [preference, resolvedMode]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }

  return context;
}
