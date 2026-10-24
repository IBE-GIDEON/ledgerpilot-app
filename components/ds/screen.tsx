import { PropsWithChildren, ReactElement, useState } from 'react';
import { Platform, RefreshControlProps, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space } from '@/constants/theme';
import { ScreenChrome, useGutter, useManualInsets } from '@/components/ds/layout';
import { useAppTheme } from '@/providers/app-theme-provider';

type ScreenProps = PropsWithChildren<
  ScreenChrome & {
    /** Wrap content in a ScrollView (default). Set false when the screen hosts its own FlatList. */
    scroll?: boolean;
    contentStyle?: StyleProp<ViewStyle>;
    refreshControl?: ReactElement<RefreshControlProps>;
    /** Pinned below the scroll area, e.g. a primary action. Rides above the keyboard when it opens. */
    footer?: React.ReactNode;
  }
>;

/**
 * Every screen's root. Scrolling screens keep the focused field above the keyboard
 * on iOS and Android; a footer action sticks to the top of the keyboard.
 */
export function Screen({
  children,
  scroll = true,
  header = false,
  tab = false,
  contentStyle,
  refreshControl,
  footer,
}: ScreenProps) {
  const { theme } = useAppTheme();
  const gutter = useGutter();
  const manual = useManualInsets({ header, tab });
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);

  const footerBottom = Math.max(insets.bottom, space.lg);
  const padding = {
    paddingHorizontal: gutter,
    paddingTop: manual.top + space.lg,
    paddingBottom: (footer ? 0 : manual.bottom) + space.xxl,
  };

  const body = scroll ? (
    <KeyboardAwareScrollView
      // Leave room for the footer that rides on the keyboard, plus a little breathing space.
      bottomOffset={footerHeight + space.xl}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      style={styles.flex}
      contentContainerStyle={[styles.content, padding, contentStyle]}>
      {children}
    </KeyboardAwareScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        styles.content,
        {
          paddingHorizontal: gutter,
          paddingTop: (Platform.OS === 'ios' && !header ? insets.top : manual.top) + space.lg,
        },
        contentStyle,
      ]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      {body}
      {footer ? (
        // When the keyboard opens, drop the home-indicator padding so the footer sits snug on it.
        <KeyboardStickyView offset={{ closed: 0, opened: footerBottom - space.md }}>
          <View
            onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
            style={[
              styles.footer,
              {
                borderTopColor: theme.border,
                backgroundColor: theme.background,
                paddingHorizontal: gutter,
                paddingBottom: footerBottom,
              },
            ]}>
            {footer}
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: space.xl,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.md,
    gap: space.sm,
  },
});
