import { Ionicons } from '@expo/vector-icons';
import { ComponentProps, PropsWithChildren } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Text } from '@/components/ds/text';
import { radius, space } from '@/constants/theme';
import { useAppTheme } from '@/providers/app-theme-provider';

type IconName = ComponentProps<typeof Ionicons>['name'];

type SearchPillProps = {
  placeholder?: string;
  onPress: () => void;
};

/** A search field look-alike that opens the screen where searching happens. */
export function SearchPill({ placeholder = 'Search', onPress }: SearchPillProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={placeholder}
      accessibilityRole="search"
      onPress={onPress}
      style={({ pressed }) => [
        styles.search,
        { backgroundColor: pressed ? theme.surfaceMuted : theme.surface },
      ]}>
      <Ionicons color={theme.textMuted} name="search" size={18} />
      <Text numberOfLines={1} variant="body" tone="muted">
        {placeholder}
      </Text>
    </Pressable>
  );
}

/** Rounded-square icon holder used inside tiles and rows. */
export function IconBox({ icon, size = 40 }: { icon: IconName; size?: number }) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.iconBox, { width: size, height: size, backgroundColor: theme.surfaceMuted }]}>
      <Ionicons color={theme.text} name={icon} size={Math.round(size * 0.48)} />
    </View>
  );
}

type TileProps = PropsWithChildren<{
  title: string;
  caption?: string;
  icon?: IconName;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}>;

/** A grid card: optional icon on top, title at the bottom, or custom content below the title. */
export function Tile({ title, caption, icon, onPress, style, children }: TileProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={caption ? `${title}, ${caption}` : title}
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: pressed ? theme.surfaceMuted : theme.surface },
        style,
      ]}>
      {icon ? <IconBox icon={icon} /> : null}
      <View style={styles.tileCopy}>
        <Text numberOfLines={1} variant="subheading">
          {title}
        </Text>
        {caption ? (
          <Text numberOfLines={1} variant="small" tone="muted">
            {caption}
          </Text>
        ) : null}
      </View>
      {children}
    </Pressable>
  );
}

type SpendBarsProps = {
  segments: { key: string; value: number; color: string }[];
};

/** Rounded colour bars sized by share, like a compact stacked chart. */
export function SpendBars({ segments }: SpendBarsProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total <= 0) {
    return null;
  }

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.bars}>
      {segments.map((segment) => (
        <View
          key={segment.key}
          style={[styles.bar, { backgroundColor: segment.color, flexGrow: Math.max(segment.value / total, 0.06) }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    alignItems: 'center',
    borderRadius: radius.control,
    flex: 1,
    flexDirection: 'row',
    gap: space.sm,
    height: 44,
    paddingHorizontal: space.md + 2,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: radius.sm,
    justifyContent: 'center',
  },
  tile: {
    borderRadius: radius.card,
    flex: 1,
    gap: space.md,
    justifyContent: 'space-between',
    minHeight: 112,
    padding: space.lg,
  },
  tileCopy: {
    gap: 2,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
    height: 22,
  },
  bar: {
    borderRadius: radius.pill,
    flexBasis: 0,
  },
});
