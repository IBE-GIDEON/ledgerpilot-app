import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ds';
import { fonts, radius, space } from '@/constants/theme';
import type { RecentAccount } from '@/lib/auth/recent-accounts';

type RecentAccountRowProps = {
  account: RecentAccount;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

/** One remembered account on the welcome screen: tap to sign straight in, hold to remove. */
export function RecentAccountRow({ account, loading, disabled, onPress, onLongPress }: RecentAccountRowProps) {
  const initial = (account.name.trim().charAt(0) || account.email.charAt(0)).toUpperCase();

  return (
    <Pressable
      accessibilityHint="Signs in with this Google account. Press and hold to remove it from this phone."
      accessibilityLabel={`Continue as ${account.name || account.email}, ${account.email}`}
      accessibilityRole="button"
      delayLongPress={400}
      disabled={disabled}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { opacity: disabled && !loading ? 0.5 : 1 },
        pressed ? styles.pressed : null,
      ]}>
      <View style={styles.avatar}>
        {account.avatarUrl ? (
          <Image
            cachePolicy="memory-disk"
            contentFit="cover"
            source={{ uri: account.avatarUrl }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <Text style={styles.initial}>{initial}</Text>
        )}
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {account.name || account.email.split('@')[0]}
        </Text>
        <Text numberOfLines={1} style={styles.email}>
          {account.email}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Ionicons color="rgba(255, 255, 255, 0.5)" name="chevron-forward" size={18} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: space.md,
    minHeight: 60,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  pressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 40,
  },
  initial: {
    color: '#FFFFFF',
    fontFamily: fonts.sansSemibold,
    fontSize: 16,
  },
  copy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  name: {
    color: '#FFFFFF',
    fontFamily: fonts.sansSemibold,
    fontSize: 16,
  },
  email: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontFamily: fonts.sans,
    fontSize: 13,
  },
});
