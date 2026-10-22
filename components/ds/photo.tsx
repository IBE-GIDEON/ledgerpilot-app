import { Image, ImageSource } from 'expo-image';
import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { radius, space } from '@/constants/theme';
import { useAppTheme } from '@/providers/app-theme-provider';

type PhotoProps = PropsWithChildren<{
  /** Bundled photo. While null, a plain charcoal panel stands in. */
  source: ImageSource | number | null;
  /** Width ÷ height. The photo keeps this shape on every screen size. */
  aspectRatio?: number;
  /** Where the subject sits, 0–1 on each axis, so crops keep it in frame. */
  focus?: { x: number; y: number };
  /** Darken for legible text laid on top. */
  scrim?: boolean;
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}>;

export function Photo({
  source,
  aspectRatio = 16 / 9,
  focus = { x: 0.5, y: 0.5 },
  scrim = false,
  rounded = true,
  style,
  accessibilityLabel,
  children,
}: PhotoProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.frame,
        { aspectRatio, backgroundColor: theme.surfaceMuted, borderRadius: rounded ? radius.card : 0 },
        style,
      ]}>
      {source ? (
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel={accessibilityLabel}
          cachePolicy="memory-disk"
          contentFit="cover"
          contentPosition={{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }}
          source={source}
          style={StyleSheet.absoluteFill}
          transition={150}
        />
      ) : null}
      {/* A soft dark wash keeps every photo in the charcoal palette. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.22)' }]} />
      {scrim ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8, 20, 15, 0.42)' }]} />
      ) : null}
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    width: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: space.lg,
    gap: space.xs,
  },
});
