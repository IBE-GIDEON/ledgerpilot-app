import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, memo, PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Text } from '@/components/ds/text';
import { radius, space } from '@/constants/theme';
import { useAppTheme } from '@/providers/app-theme-provider';

type IconName = ComponentProps<typeof Ionicons>['name'];

type CardProps = PropsWithChildren<{
  tone?: 'surface' | 'primary' | 'muted';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}>;

export function Card({ children, tone = 'surface', padded = true, style, onPress, accessibilityLabel }: CardProps) {
  const { theme } = useAppTheme();

  const look = {
    surface: { backgroundColor: theme.surface, borderColor: theme.surface },
    muted: { backgroundColor: theme.surfaceMuted, borderColor: theme.surfaceMuted },
    primary: { backgroundColor: theme.hero, borderColor: theme.hero },
  }[tone];

  const cardStyle = [styles.card, look, padded ? styles.padded : null, style];

  if (!onPress) {
    return <View style={cardStyle}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed ? { opacity: 0.85 } : null]}>
      {children}
    </Pressable>
  );
}

type SectionProps = PropsWithChildren<{
  title?: string;
  action?: { label: string; onPress: () => void };
  footnote?: string;
  style?: StyleProp<ViewStyle>;
}>;

/** A labelled group of content with an optional trailing link. */
export function Section({ title, action, footnote, children, style }: SectionProps) {
  return (
    <View style={[styles.section, style]}>
      {title || action ? (
        <View style={styles.sectionHeader}>
          {title ? (
            <Text accessibilityRole="header" numberOfLines={1} variant="subheading">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action ? (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={action.onPress}>
              <Text variant="smallMedium" tone="primary">
                {action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
      {footnote ? (
        <Text variant="small" tone="faint">
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

/** Rows inside a bordered container with hairline dividers between them. */
export function List({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { theme } = useAppTheme();
  const items = (Array.isArray(children) ? children.flat() : [children]).filter(Boolean);

  return (
    <View style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.surface }, style]}>
      {items.map((child, index) => (
        <View key={index}>
          {index > 0 ? <Divider inset={space.lg} /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { theme } = useAppTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, marginLeft: inset, backgroundColor: theme.border }} />;
}

type RowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconTone?: 'default' | 'primary' | 'accent' | 'negative' | 'positive';
  /** Right-hand content: an Amount, a Badge or plain text. */
  trailing?: ReactNode;
  value?: string;
  chevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
};

export const Row = memo(function Row({
  title,
  subtitle,
  icon,
  iconTone = 'default',
  trailing,
  value,
  chevron,
  destructive,
  onPress,
  onLongPress,
  accessibilityLabel,
}: RowProps) {
  const { theme } = useAppTheme();

  const iconColor = {
    default: theme.textMuted,
    primary: theme.tint,
    accent: theme.accent,
    negative: theme.negative,
    positive: theme.positive,
  }[destructive ? 'negative' : iconTone];

  const content = (
    <>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: theme.surfaceMuted }]}>
          <Ionicons color={iconColor} name={icon} size={18} />
        </View>
      ) : null}
      <View style={styles.rowBody}>
        <Text numberOfLines={1} variant="bodyMedium" tone={destructive ? 'negative' : 'default'}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} variant="small" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text numberOfLines={1} variant="small" tone="muted" style={styles.rowValue}>
          {value}
        </Text>
      ) : null}
      {trailing ? <View style={styles.rowTrailing}>{trailing}</View> : null}
      {chevron ? <Ionicons color={theme.textFaint} name="chevron-forward" size={18} /> : null}
    </>
  );

  if (!onPress && !onLongPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      android_ripple={{ color: theme.surfaceMuted }}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? { backgroundColor: theme.surfaceMuted } : null]}>
      {content}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  padded: {
    padding: space.lg + 2,
    gap: space.md,
  },
  section: {
    gap: space.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  list: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  rowIcon: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  rowBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowValue: {
    flexShrink: 1,
    maxWidth: '45%',
  },
  rowTrailing: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: '45%',
  },
});
