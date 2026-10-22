import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ds';
import { fonts, radius } from '@/constants/theme';
import { useAppTheme } from '@/providers/app-theme-provider';

type AvatarProps = {
  name: string;
  uri?: string | null;
  size?: number;
};

/** Round profile photo, or the first letter of the name on a charcoal disc. */
export function Avatar({ name, uri, size = 56 }: AvatarProps) {
  const { theme } = useAppTheme();
  const initial = name.trim().slice(0, 1).toUpperCase() || 'L';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        {
          width: size,
          height: size,
          backgroundColor: theme.surfaceMuted,
        },
      ]}>
      {uri ? (
        <Image cachePolicy="memory-disk" contentFit="cover" source={{ uri }} style={styles.image} transition={150} />
      ) : (
        <Text
          tone="primary"
          style={{ fontFamily: fonts.display, fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.52) }}>
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.pill,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
});
