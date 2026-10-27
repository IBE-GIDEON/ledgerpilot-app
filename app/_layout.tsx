import {
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
} from '@expo-google-fonts/urbanist';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { initStripe } from '@stripe/stripe-react-native';
import 'react-native-reanimated';

import { IntroSplash } from '@/components/launch/intro-splash';
import { fonts } from '@/constants/theme';
import { useAlertWatcher } from '@/lib/alerts/use-alert-watcher';
import { env } from '@/lib/config/env';
import { useReminderRouting } from '@/lib/notifications/use-reminder-routing';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AppThemeProvider, useAppTheme } from '@/providers/app-theme-provider';
import { LedgerProvider, useLedger } from '@/providers/ledger-provider';

void SplashScreen.preventAutoHideAsync();

function AppNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { theme, isDark } = useAppTheme();
  const { isAuthenticated, isHydratingAuth, onboardingComplete } = useLedger();
  const supabase = getSupabaseClient();

  const navigationTheme = useMemo(
    () => ({
      ...DefaultTheme,
      dark: isDark,
      colors: {
        ...DefaultTheme.colors,
        background: theme.background,
        border: theme.border,
        card: theme.background,
        notification: theme.negative,
        primary: theme.tint,
        text: theme.text,
      },
    }),
    [isDark, theme]
  );

  const [introDone, setIntroDone] = useState(false);
  const finishIntro = useCallback(() => setIntroDone(true), []);

  useReminderRouting(introDone && isAuthenticated && onboardingComplete);
  useAlertWatcher(introDone && isAuthenticated && onboardingComplete);

  // The animated intro takes over from the native splash as soon as fonts are in;
  // it keeps covering the app until the session has loaded too.
  useEffect(() => {
    if (fontsReady) {
      void SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const handleAppStateChange = (nextState: string) => {
      if (nextState === 'active') {
        supabase.auth.startAutoRefresh();
        return;
      }

      supabase.auth.stopAutoRefresh();
    };

    handleAppStateChange(AppState.currentState ?? 'active');
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [supabase]);

  useEffect(() => {
    if (!env.stripePublishableKey) {
      return;
    }

    initStripe({
      publishableKey: env.stripePublishableKey,
      urlScheme: 'lancer',
    }).catch((error) => {
      console.warn('Stripe failed to initialize:', error);
    });
  }, []);

  if (!fontsReady) {
    return null;
  }

  // Full-height card on iOS. formSheet sizes to its content, which collapses scrolling forms.
  const modal = 'modal' as const;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.background },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.tint,
          headerTitleStyle: { color: theme.text, fontFamily: fonts.display, fontSize: 17 },
          headerLargeTitleStyle: { color: theme.text, fontFamily: fonts.display },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Home' }} />
        <Stack.Screen name="callback" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="search" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="setup" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="reminders-intro" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="billing-setup" options={{ title: 'Payment & auto-pay' }} />
        <Stack.Screen name="upgrade" options={{ title: 'Plans', presentation: modal }} />
        <Stack.Screen name="transaction-create" options={{ title: 'New transaction', presentation: modal }} />
        <Stack.Screen name="transaction-detail" options={{ title: 'Transaction' }} />
        <Stack.Screen name="export" options={{ title: 'Export' }} />
        <Stack.Screen
          name="alert-answer"
          options={{ headerShown: false, gestureEnabled: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="alert" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="bank-alerts" options={{ title: 'Bank alerts' }} />
        <Stack.Screen name="breakdown" options={{ title: 'Your year' }} />
        <Stack.Screen name="connections" options={{ title: 'Connected accounts' }} />
        <Stack.Screen name="bank-link" options={{ title: 'Link a bank' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="profile-edit" options={{ title: 'Profile' }} />
        <Stack.Screen name="currency" options={{ title: 'Currency' }} />
        <Stack.Screen name="support" options={{ title: 'Help' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
        <Stack.Screen name="terms" options={{ title: 'Terms' }} />
        <Stack.Screen name="delete-account" options={{ title: 'Delete account' }} />
      </Stack>
      {introDone ? null : <IntroSplash onDone={finishIntro} ready={!isHydratingAuth} />}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
  });

  return (
    <KeyboardProvider>
      <AppThemeProvider>
        <LedgerProvider>
          <AppNavigator fontsReady={fontsLoaded || Boolean(fontError)} />
        </LedgerProvider>
      </AppThemeProvider>
    </KeyboardProvider>
  );
}
