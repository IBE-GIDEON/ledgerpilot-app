import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text, useGutter } from '@/components/ds';
import { WordCycle } from '@/components/onboarding-v2/word-cycle';
import { fonts, radius, space } from '@/constants/theme';
import { useLedger } from '@/providers/ledger-provider';

const words = [
  { label: 'Track', icon: 'stats-chart' },
  { label: 'Save', icon: 'wallet' },
  { label: 'Deduct', icon: 'receipt' },
  { label: 'File', icon: 'document-text' },
] as const;

/** First screen after the splash: light at the top fading to black, one message, two actions. Never scrolls. */
export default function WelcomeScreen() {
  const router = useRouter();
  const { auth } = useLedger();
  const insets = useSafeAreaInsets();
  const gutter = useGutter();

  const handleExplore = () => {
    auth.startDemo();
    router.replace('/dashboard');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#FFFFFF', '#F1F1F2', '#3A3A3E', '#0B0B0C', '#000000']}
        locations={[0, 0.34, 0.62, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.top, { paddingTop: insets.top + space.xxl * 2, paddingHorizontal: gutter + space.sm }]}>
        <WordCycle color="#0B0B0C" words={words} />
      </View>

      <View style={[styles.bottom, { paddingHorizontal: gutter, paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.message}>
          <View style={styles.mark}>
            <Image accessibilityLabel="Lancer" source={require('@/assets/images/logo.png')} style={styles.markLogo} />
          </View>
          <Text accessibilityRole="header" style={styles.headline}>
            {'Freelance taxes,\nsorted.'}
          </Text>
          <Text style={styles.caption}>
            Track what you earn and spend, find deductions, and know exactly what to save for tax.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Get started" onPress={() => router.push('/signup')} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/login')}
            style={({ pressed }) => [styles.secondary, pressed ? styles.secondaryPressed : null]}>
            <Text style={styles.secondaryLabel}>I have an account</Text>
          </Pressable>
          <Pressable
            accessibilityHint="Opens Lancer with sample data. Nothing is saved."
            accessibilityRole="button"
            hitSlop={12}
            onPress={handleExplore}
            style={styles.demo}>
            <Text style={styles.demoLabel}>Explore the demo</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#000000',
    flex: 1,
  },
  top: {
    flex: 1,
  },
  bottom: {
    gap: space.xl,
  },
  message: {
    gap: space.md,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    marginBottom: space.xs,
    width: 40,
  },
  markLogo: {
    height: 26,
    width: 26,
  },
  headline: {
    color: '#FFFFFF',
    fontFamily: fonts.display,
    fontSize: 34,
    letterSpacing: -0.6,
    lineHeight: 40,
  },
  caption: {
    color: 'rgba(255, 255, 255, 0.62)',
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
    maxWidth: 300,
  },
  actions: {
    gap: space.sm + 2,
  },
  secondary: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.control,
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  secondaryLabel: {
    color: '#FFFFFF',
    fontFamily: fonts.sansMedium,
    fontSize: 16,
  },
  demo: {
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  demoLabel: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
});
