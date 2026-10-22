import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import { ComponentProps, useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Badge, Button, EmptyState, List, Row, Screen, Section } from '@/components/ds';
import { formatCurrency, formatFullDate } from '@/lib/formatters';
import { ensureNotificationPermissionsAsync } from '@/lib/notifications/native';
import { useLedger } from '@/providers/ledger-provider';

type PermissionState = 'unknown' | 'granted' | 'undetermined' | 'blocked' | 'unsupported';

type Reminder = {
  id: string;
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  route?: '/tax' | '/activity' | '/mileage' | '/upgrade';
};

async function readPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') {
    return 'unsupported';
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }
  return current.canAskAgain ? 'undetermined' : 'blocked';
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { access, profile, quarters, receipts, transactions, trips } = useLedger();
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [requesting, setRequesting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      readPermission()
        .then((state) => active && setPermission(state))
        .catch(() => active && setPermission('unsupported'));
      return () => {
        active = false;
      };
    }, [])
  );

  const reminders = useMemo<Reminder[]>(() => {
    const list: Reminder[] = [];

    const nextQuarter =
      quarters.find((quarter) => quarter.status === 'Next up') ??
      quarters.find((quarter) => quarter.status === 'Upcoming');
    if (nextQuarter) {
      list.push({
        id: 'tax',
        title: `${nextQuarter.label} tax`,
        subtitle: `${formatCurrency(nextQuarter.amountDue, 0)} · ${formatFullDate(nextQuarter.dueDate)}`,
        icon: 'calendar-outline',
        route: '/tax',
      });
    }

    const receiptsToReview = receipts.filter((item) => item.status === 'Needs review').length;
    if (receiptsToReview > 0) {
      list.push({
        id: 'receipts',
        title: 'Receipts to review',
        subtitle: `${receiptsToReview} waiting`,
        icon: 'receipt-outline',
        route: '/activity',
      });
    }

    const personalExpenses = transactions.filter((item) => item.kind === 'expense' && !item.deductible).length;
    if (personalExpenses > 0) {
      list.push({
        id: 'expenses',
        title: 'Check deductions',
        subtitle: `${personalExpenses} marked personal`,
        icon: 'wallet-outline',
        route: '/activity',
      });
    }

    if (profile.mileageMode !== 'Never') {
      const now = new Date();
      const monthMiles = trips
        .filter((trip) => {
          const date = new Date(trip.date);
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        })
        .reduce((total, trip) => total + trip.miles, 0);
      list.push({
        id: 'mileage',
        title: 'Mileage',
        subtitle: monthMiles > 0 ? `${monthMiles.toFixed(1)} mi this month` : 'No trips this month',
        icon: 'navigate-outline',
        route: '/mileage',
      });
    }

    if (access.subscriptionStatus === 'trialing' && access.trialEndsAt) {
      list.push({
        id: 'trial',
        title: 'Trial ending',
        subtitle: `Ends ${formatFullDate(access.trialEndsAt)}`,
        icon: 'time-outline',
        route: '/upgrade',
      });
    }

    return list;
  }, [access.subscriptionStatus, access.trialEndsAt, profile.mileageMode, quarters, receipts, transactions, trips]);

  const turnOn = async () => {
    if (permission === 'blocked') {
      void Linking.openSettings();
      return;
    }

    setRequesting(true);
    try {
      const granted = await ensureNotificationPermissionsAsync();
      setPermission(granted ? 'granted' : await readPermission());
      if (!granted) {
        Alert.alert('Notifications are off', 'You can turn them on for Lancer in your phone settings.');
      }
    } catch {
      Alert.alert('Notifications unavailable', 'This device could not set up reminders right now.');
    } finally {
      setRequesting(false);
    }
  };

  const permissionBadge =
    permission === 'granted' ? (
      <Badge label="On" tone="positive" />
    ) : permission === 'unknown' ? null : (
      <Badge label={permission === 'unsupported' ? 'Unavailable' : 'Off'} />
    );

  const permissionSubtitle =
    permission === 'unsupported'
      ? 'Needs the mobile app'
      : permission === 'blocked'
        ? 'Off in phone settings'
        : !access.billingSetupComplete
          ? 'Starts once your plan is set'
          : undefined;

  return (
    <Screen header>
      <Section title="Reminders">
        <List>
          <Row
            icon="notifications-outline"
            subtitle={permissionSubtitle}
            title="Notifications"
            trailing={permissionBadge}
          />
        </List>
        {permission === 'undetermined' || permission === 'blocked' ? (
          <Button
            label={permission === 'blocked' ? 'Settings' : 'Turn on'}
            loading={requesting}
            onPress={() => void turnOn()}
            variant="secondary"
          />
        ) : null}
      </Section>

      <Section title="Coming up">
        {reminders.length === 0 ? (
          <EmptyState
            body="Deadlines show up here."
            icon="checkmark-done-outline"
            title="All clear"
          />
        ) : (
          <List>
            {reminders.map((item) => (
              <Row
                key={item.id}
                chevron={Boolean(item.route)}
                icon={item.icon}
                onPress={item.route ? () => router.push(item.route!) : undefined}
                subtitle={item.subtitle}
                title={item.title}
              />
            ))}
          </List>
        )}
      </Section>
    </Screen>
  );
}
