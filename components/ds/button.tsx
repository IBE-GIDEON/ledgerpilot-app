import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ComponentProps } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { Text } from '@/components/ds/text';
import { radius, space } from '@/constants/theme';
import { useAppTheme } from '@/providers/app-theme-provider';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'regular' | 'small';
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { theme } = useAppTheme();

  const palette = {
    primary: { bg: theme.primary, pressed: theme.primaryPressed, fg: theme.onPrimary, border: theme.primary },
    secondary: { bg: theme.surfaceMuted, pressed: theme.borderStrong, fg: theme.text, border: theme.surfaceMuted },
    ghost: { bg: 'transparent', pressed: theme.surface, fg: theme.tint, border: 'transparent' },
    destructive: { bg: theme.surface, pressed: theme.surfaceMuted, fg: theme.negative, border: theme.surface },
  }[variant];

  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: inactive }}
      android_ripple={variant === 'ghost' ? { color: theme.surfaceMuted } : undefined}
      disabled={inactive}
      onPress={() => {
        if (Platform.OS === 'ios') {
          void Haptics.selectionAsync();
        }
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        size === 'small' ? styles.small : styles.regular,
        {
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          backgroundColor: pressed ? palette.pressed : palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons color={palette.fg} name={icon} size={size === 'small' ? 16 : 18} /> : null}
          <Text
            numberOfLines={1}
            variant={size === 'small' ? 'smallMedium' : 'bodyMedium'}
            style={{ color: palette.fg }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

type IconButtonProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  badge?: boolean;
};

/** 44pt round icon button for headers. `label` is read by screen readers. */
export function IconButton({ icon, label, onPress, badge }: IconButtonProps) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.icon,
        { backgroundColor: pressed ? theme.surfaceMuted : theme.surface, borderColor: theme.surface },
      ]}>
      <Ionicons color={theme.text} name={icon} size={20} />
      {badge ? <View style={[styles.badge, { backgroundColor: theme.negative, borderColor: theme.surface }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  regular: {
    minHeight: 52,
    paddingHorizontal: space.xl,
  },
  small: {
    minHeight: 36,
    paddingHorizontal: space.lg,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  badge: {
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    right: 10,
    top: 10,
    width: 10,
  },
});
