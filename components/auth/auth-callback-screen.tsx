import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Screen, Text } from '@/components/ds';
import { radius, space } from '@/constants/theme';
import { usingSupabaseBackend } from '@/lib/config/env';
import { createSessionFromUrl } from '@/lib/supabase/auth';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';

export function AuthCallbackScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { isAuthenticated, isHydratingAuth, onboardingComplete } = useLedger();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const liveUrl = Linking.useURL();
  const [isProcessingUrl, setIsProcessingUrl] = useState(usingSupabaseBackend);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const processIncomingUrl = async () => {
      if (!usingSupabaseBackend || !supabase) {
        if (active) {
          setIsProcessingUrl(false);
        }
        return;
      }

      try {
        const incomingUrl = liveUrl ?? (await Linking.getInitialURL());

        if (incomingUrl) {
          await createSessionFromUrl(supabase, incomingUrl);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'We couldn’t finish confirming this account link.'
          );
        }
      } finally {
        if (active) {
          setIsProcessingUrl(false);
        }
      }
    };

    void processIncomingUrl();

    return () => {
      active = false;
    };
  }, [liveUrl, supabase]);

  if (!isProcessingUrl && !isHydratingAuth && !errorMessage) {
    if (!isAuthenticated) {
      return <Redirect href="/welcome" />;
    }

    // Billing and trial status gate individual Pro features, never the whole app (matches app/index.tsx).
    if (!onboardingComplete) {
      return <Redirect href="/setup" />;
    }

    return <Redirect href="/dashboard" />;
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.body}>
        <View style={[styles.icon, { backgroundColor: theme.surface }]}>
          {errorMessage ? (
            <Ionicons color={theme.negative} name="alert-circle-outline" size={28} />
          ) : (
            <ActivityIndicator color={theme.tint} />
          )}
        </View>

        <Text accessibilityRole="header" align="center" variant="heading">
          {errorMessage ? 'Sign-in failed' : 'Signing you in'}
        </Text>
        {errorMessage ? (
          <Text accessibilityLiveRegion="polite" align="center" tone="muted" variant="small">
            {errorMessage}
          </Text>
        ) : null}
      </View>

      {errorMessage ? <Button label="Sign in" onPress={() => router.replace('/welcome')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  body: {
    alignItems: 'center',
    gap: space.md,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radius.card,
    height: 64,
    justifyContent: 'center',
    marginBottom: space.xs,
    width: 64,
  },
});
