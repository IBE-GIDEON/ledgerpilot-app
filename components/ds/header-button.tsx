import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ds/text';
import { useAppTheme } from '@/providers/app-theme-provider';

type HeaderButtonProps = {
  label: string;
  onPress: () => void;
  /** The confirming action (Save, Done) is bold, like iOS. */
  primary?: boolean;
  loading?: boolean;
  disabled?: boolean;
};

/** Text button for a native header's left or right slot, e.g. Cancel and Save on a sheet. */
export function HeaderButton({ label, onPress, primary = false, loading = false, disabled = false }: HeaderButtonProps) {
  const { theme } = useAppTheme();
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: inactive }}
      disabled={inactive}
      hitSlop={12}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: inactive ? 0.4 : pressed ? 0.6 : 1 }]}>
      {loading ? (
        <ActivityIndicator color={theme.tint} />
      ) : (
        <Text variant={primary ? 'subheading' : 'body'} style={{ color: theme.tint }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 4,
  },
});
