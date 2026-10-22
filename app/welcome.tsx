import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Photo, Text, useGutter } from '@/components/ds';
import { photos } from '@/constants/images';
import { space } from '@/constants/theme';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';

/** First screen after the splash. Fixed to one screen on every device; nothing scrolls. */
export default function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { auth } = useLedger();
  const insets = useSafeAreaInsets();
  const gutter = useGutter();
  const { width, height } = useWindowDimensions();

  // The photo takes the top half; short phones get a little less so the actions always fit.
  const photoHeight = Math.round(height * (height < 700 ? 0.46 : 0.54));

  const handleExplore = () => {
    auth.startDemo();
    router.replace('/dashboard');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Photo
        accessibilityLabel={photos.welcome.alt}
        aspectRatio={width / photoHeight}
        focus={photos.welcome.focus}
        rounded={false}
        source={photos.welcome.source}
      />

      <View style={[styles.panel, { paddingHorizontal: gutter, paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.brand}>
          <Text accessibilityRole="header" variant="display">
            Lancer
          </Text>
          <Text variant="body" tone="muted">
            Money and tax for freelancers.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Get started" onPress={() => router.push('/signup')} />
          <Button label="I have an account" onPress={() => router.push('/login')} variant="secondary" />
          <Pressable
            accessibilityHint="Opens Lancer with sample data. Nothing is saved."
            accessibilityRole="button"
            hitSlop={12}
            onPress={handleExplore}
            style={styles.demo}>
            <Text variant="smallMedium" tone="muted">
              Explore the demo
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  panel: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: space.xl,
  },
  brand: {
    gap: space.xs,
  },
  actions: {
    gap: space.sm + 2,
  },
  demo: {
    alignItems: 'center',
    paddingVertical: space.sm,
  },
});
