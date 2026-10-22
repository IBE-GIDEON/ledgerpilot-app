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
import { useEffect, useMemo } from 'react';
import { AppState, Platform } from 'react-native';
import { initStripe } from '@stripe/stripe-react-native';
import 'react-native-reanimated';
import '@/lib/mileage/background';

import { fonts } from '@/constants/theme';
import { env } from '@/lib/config/env';
import { getSupabaseClient } from '@/lib/supabase/client';
import { AppThemeProvider, useAppTheme } from '@/providers/app-theme-provider';
import { LedgerProvider, useLedger } from '@/providers/ledger-provider';

void SplashScreen.preventAutoHideAsync();

function AppNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { theme, isDark } = useAppTheme();
  const { isHydratingAuth } = useLedger();
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

  const ready = fontsReady && !isHydratingAuth;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

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

    handleAppStateChange(AppState.currentState);
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
      urlScheme: 'ledgerpilot',
    }).catch((error) => {
      console.warn('Stripe failed to initialize:', error);
    });
  }, []);

  if (!fontsReady) {
    return null;
  }

  const modal = Platform.OS === 'ios' ? ('formSheet' as const) : ('modal' as const);

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
        <Stack.Screen name="login" options={{ title: '' }} />
        <Stack.Screen name="signup" options={{ title: '' }} />
        <Stack.Screen name="forgot-password" options={{ title: '' }} />
        <Stack.Screen name="setup" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="billing-setup" options={{ title: 'Payment method' }} />
        <Stack.Screen name="upgrade" options={{ title: 'Plans', presentation: modal }} />
        <Stack.Screen name="transaction-create" options={{ title: 'New transaction', presentation: modal }} />
        <Stack.Screen name="transaction-detail" options={{ title: 'Transaction' }} />
        <Stack.Screen name="report-packet" options={{ title: 'CPA packet' }} />
        <Stack.Screen name="connections" options={{ title: 'Connected accounts' }} />
        <Stack.Screen name="bank-link" options={{ title: 'Link a bank' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="profile-edit" options={{ title: 'Profile' }} />
        <Stack.Screen name="support" options={{ title: 'Help' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
        <Stack.Screen name="terms" options={{ title: 'Terms' }} />
        <Stack.Screen name="delete-account" options={{ title: 'Delete account' }} />
      </Stack>
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
    <AppThemeProvider>
      <LedgerProvider>
        <AppNavigator fontsReady={fontsLoaded || Boolean(fontError)} />
      </LedgerProvider>
    </AppThemeProvider>
  );
}
