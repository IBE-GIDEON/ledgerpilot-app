import { PropsWithChildren, ReactElement } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControlProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space } from '@/constants/theme';
import { ScreenChrome, useGutter, useManualInsets } from '@/components/ds/layout';
import { useAppTheme } from '@/providers/app-theme-provider';

type ScreenProps = PropsWithChildren<
  ScreenChrome & {
    /** Wrap content in a ScrollView (default). Set false when the screen hosts its own FlatList. */
    scroll?: boolean;
    /** Lift content above the keyboard for forms. */
    keyboard?: boolean;
    contentStyle?: StyleProp<ViewStyle>;
    refreshControl?: ReactElement<RefreshControlProps>;
    /** Pinned below the scroll area, e.g. a primary action. Sits above the home indicator. */
    footer?: React.ReactNode;
  }
>;

export function Screen({
  children,
  scroll = true,
  keyboard = false,
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

  const padding = {
    paddingHorizontal: gutter,
    paddingTop: manual.top + space.lg,
    paddingBottom: (footer ? 0 : manual.bottom) + space.xxl,
  };

  const body = scroll ? (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      style={styles.flex}
      contentContainerStyle={[styles.content, padding, contentStyle]}>
      {children}
    </ScrollView>
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

  const footerView = footer ? (
    <View
      style={[
        styles.footer,
        {
          borderTopColor: theme.border,
          backgroundColor: theme.background,
          paddingHorizontal: gutter,
          paddingBottom: Math.max(insets.bottom, space.lg),
        },
      ]}>
      {footer}
    </View>
  ) : null;

  const inner = (
    <>
      {body}
      {footerView}
    </>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      {keyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
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
