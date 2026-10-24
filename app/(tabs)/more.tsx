import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Avatar } from '@/components/account/avatar';
import { Card, List, PageHeader, Row, Screen, Text } from '@/components/ds';
import { space } from '@/constants/theme';
import { featureFlags } from '@/lib/config/env';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';

const paymentLabels = {
  ready: 'On file',
  pending: 'Pending',
  missing: 'Not added',
} as const;

/** One job: a plain index of your profile, plan and account settings. */
export default function AccountScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { access, activePlan, auth, authBusy, profile, usingLiveBackend } = useLedger();
  const [signingOut, setSigningOut] = useState(false);

  const version = Constants.expoConfig?.version ?? '1.0';
  const planStatus =
    access.subscriptionStatus === 'trialing'
      ? access.trialDaysRemaining === 1
        ? '1 day left'
        : `${access.trialDaysRemaining} days left`
      : access.subscriptionStatus === 'expired'
        ? 'Trial ended'
        : null;
  const planValue = planStatus ? `${activePlan} · ${planStatus}` : activePlan;

  const signOut = async () => {
    setSigningOut(true);
    try {
      await auth.signOut();
      router.replace('/welcome');
    } catch (error) {
      Alert.alert('Sign out failed', error instanceof Error ? error.message : 'Unable to sign you out right now.');
    } finally {
      setSigningOut(false);
    }
  };

  const confirmSignOut = () => {
    if (signingOut || authBusy) {
      return;
    }

    Alert.alert('Sign out of Lancer?', usingLiveBackend ? 'Your data stays in your account.' : undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <Screen tab>
      <PageHeader title="Account" />

      <Card
        accessibilityLabel={`${profile.name || 'Your profile'}${profile.role ? `, ${profile.role}` : ''}. Edit profile`}
        onPress={() => router.push('/profile-edit')}>
        <View style={styles.profile}>
          <Avatar name={profile.name} uri={profile.avatarUrl} />
          <View style={styles.profileText}>
            <Text numberOfLines={1} variant="heading">
              {profile.name || 'Your profile'}
            </Text>
            {profile.role?.trim() ? (
              <Text numberOfLines={1} variant="small" tone="muted">
                {profile.role}
              </Text>
            ) : null}
          </View>
          <Ionicons color={theme.textFaint} name="chevron-forward" size={18} />
        </View>
      </Card>

      <List>
        <Row chevron icon="ribbon-outline" onPress={() => router.push('/upgrade')} title="Plan" value={planValue} />
        <Row
          chevron
          icon="card-outline"
          onPress={() => router.push('/billing-setup')}
          title="Payment method"
          value={paymentLabels[access.paymentMethodStatus]}
        />
        {featureFlags.bankSync ? (
          <Row chevron icon="link-outline" onPress={() => router.push('/connections')} title="Connected accounts" />
        ) : null}
        <Row chevron icon="notifications-outline" onPress={() => router.push('/notifications')} title="Notifications" />
      </List>

      <List>
        <Row chevron icon="help-circle-outline" onPress={() => router.push('/support')} title="Help" />
        <Row chevron icon="shield-checkmark-outline" onPress={() => router.push('/privacy')} title="Privacy" />
        <Row chevron icon="document-text-outline" onPress={() => router.push('/terms')} title="Terms" />
      </List>

      <List>
        {/* No confirmation: the remembered accounts on the welcome screen make switching one tap each way. */}
        <Row
          icon="swap-horizontal-outline"
          onPress={() => void signOut()}
          title={signingOut ? 'Switching…' : 'Switch account'}
        />
        <Row icon="log-out-outline" onPress={confirmSignOut} title={signingOut ? 'Signing out…' : 'Sign out'} />
        <Row destructive icon="trash-outline" onPress={() => router.push('/delete-account')} title="Delete account" />
      </List>

      <Text align="center" variant="caption" tone="faint">
        {`Lancer ${version}${usingLiveBackend ? '' : ' · Preview mode'}`}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  profileText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
});
