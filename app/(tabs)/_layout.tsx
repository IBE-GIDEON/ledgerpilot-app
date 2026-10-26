import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { Platform } from 'react-native';

import { fonts } from '@/constants/theme';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';

export default function TabLayout() {
  const { isAuthenticated, isHydratingAuth, onboardingComplete } = useLedger();
  const { theme } = useAppTheme();

  if (isHydratingAuth) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  if (!onboardingComplete) {
    return <Redirect href="/setup" />;
  }

  const android = Platform.OS === 'android';

  return (
    <NativeTabs
      backgroundColor={android ? theme.background : undefined}
      iconColor={{ default: theme.textFaint, selected: theme.tint }}
      indicatorColor={theme.surfaceMuted}
      labelStyle={{
        default: { color: theme.textMuted, fontFamily: fonts.sansMedium, fontSize: android ? 12 : 10 },
        selected: { color: theme.tint, fontFamily: fonts.sansMedium, fontSize: android ? 12 : 10 },
      }}
      labelVisibilityMode="labeled"
      minimizeBehavior="onScrollDown"
      rippleColor={theme.surfaceMuted}
      tintColor={theme.tint}>
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Icon md="home" sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        <NativeTabs.Trigger.Icon md="receipt_long" sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }} />
        <NativeTabs.Trigger.Label>Money</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Icon md="account_circle" sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} />
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
