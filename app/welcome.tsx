import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, useGutter } from '@/components/ds';
import { GoogleButton } from '@/components/onboarding-v2/google-button';
import { WordCycle } from '@/components/onboarding-v2/word-cycle';
import { fonts, space } from '@/constants/theme';
import { useLedger } from '@/providers/ledger-provider';

// What the user does in Lancer. Lancer records and estimates; it never holds or moves money.
const words = [
  { label: 'Log income', icon: 'arrow-down-circle-outline' },
  { label: 'Track expenses', icon: 'receipt-outline' },
  { label: 'Find deductions', icon: 'pricetag-outline' },
  { label: 'Estimate taxes', icon: 'calculator-outline' },
] as const;

/** First screen after the splash: light at the top fading to black, one message, one way in. Never scrolls. */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gutter = useGutter();
  const { auth, authBusy } = useLedger();
  const [error, setError] = useState<string | null>(null);

  const continueWithGoogle = async () => {
    setError(null);
    try {
      await auth.signInWithGoogle();
      router.replace('/');
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Google sign-in failed. Try again.';
      // Closing the Google sheet is a choice, not an error.
      if (!/cancel/i.test(message)) {
        setError(message);
      }
    }
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
          <GoogleButton loading={authBusy} onPress={() => void continueWithGoogle()} />
          {error ? (
            <Text accessibilityLiveRegion="polite" accessibilityRole="alert" align="center" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <Text align="center" style={styles.legal}>
            {'By continuing you agree to the '}
            <Text onPress={() => router.push('/terms')} style={styles.legalLink}>
              Terms
            </Text>
            {' and '}
            <Text onPress={() => router.push('/privacy')} style={styles.legalLink}>
              Privacy Policy
            </Text>
            .
          </Text>
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
    marginBottom: space.xs,
  },
  markLogo: {
    height: 44,
    width: 44,
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
  error: {
    color: '#FF8A8E',
    fontFamily: fonts.sansMedium,
    fontSize: 14,
  },
  legal: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
  },
  legalLink: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
