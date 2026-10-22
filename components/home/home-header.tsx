import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton, SearchPill, Text } from '@/components/ds';
import { radius, space } from '@/constants/theme';
import { useAppTheme } from '@/providers/app-theme-provider';

type HomeHeaderProps = {
  name: string;
  avatarUrl?: string | null;
  /** Shows a dot on the bell when something needs review. */
  hasAlerts?: boolean;
};

/** Avatar (opens Account), search (opens Money) and notifications. */
export function HomeHeader({ name, avatarUrl, hasAlerts = false }: HomeHeaderProps) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const initial = (name.trim().charAt(0) || 'L').toUpperCase();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="Account"
        accessibilityRole="button"
        hitSlop={6}
        onPress={() => router.push('/more')}
        style={({ pressed }) => [styles.avatar, { backgroundColor: theme.surfaceMuted, opacity: pressed ? 0.8 : 1 }]}>
        {avatarUrl ? (
          <Image
            accessibilityIgnoresInvertColors
            cachePolicy="memory-disk"
            contentFit="cover"
            source={{ uri: avatarUrl }}
            style={StyleSheet.absoluteFill}
            transition={150}
          />
        ) : (
          <Text variant="subheading">{initial}</Text>
        )}
      </Pressable>
      <SearchPill onPress={() => router.push('/activity')} />
      <IconButton
        badge={hasAlerts}
        icon="notifications-outline"
        label={hasAlerts ? 'Notifications, items to review' : 'Notifications'}
        onPress={() => router.push('/notifications')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.pill,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
});
