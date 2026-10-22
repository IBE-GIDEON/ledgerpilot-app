import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const MAX_CONTENT_WIDTH = 640;

/** Horizontal gutter that scales with the device: tighter on small phones, centred column on tablets. */
export function useGutter() {
  const { width } = useWindowDimensions();

  if (width < 375) {
    return 16;
  }

  if (width > MAX_CONTENT_WIDTH + 48) {
    return Math.round((width - MAX_CONTENT_WIDTH) / 2);
  }

  return 20;
}

export type ScreenChrome = {
  /** A native stack header is shown above this screen. */
  header?: boolean;
  /** The screen lives inside the native tab bar. */
  tab?: boolean;
};

/**
 * Padding a scroll container must add itself. On iOS the system adjusts scroll insets
 * automatically (status bar, header, tab bar, home indicator), so nothing is added there.
 * On Android native tabs already inset the bottom and native headers occupy the top.
 */
export function useManualInsets({ header = false, tab = false }: ScreenChrome) {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'ios') {
    return { top: 0, bottom: 0 };
  }

  return {
    top: header ? 0 : insets.top,
    bottom: tab ? 0 : insets.bottom,
  };
}
