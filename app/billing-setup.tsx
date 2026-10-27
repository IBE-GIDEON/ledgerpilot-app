import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';

import { Button, Card, List, Row, Screen, SwitchRow, Text } from '@/components/ds';
import { plans } from '@/lib/billing/features';
import { getStoreSubscription, StoreSubscription, storeSubscriptionsUrl } from '@/lib/billing/revenuecat';
import { formatFullDate } from '@/lib/formatters';
import { useLedger } from '@/providers/ledger-provider';

const STORE = Platform.OS === 'ios' ? 'the App Store' : 'Google Play';
const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Google Play';

/**
 * One job: see how Lancer is paid for and switch auto-pay. The card itself is saved and charged by
 * Google Play (or the App Store), which remembers it; Lancer never sees card details.
 */
export default function PaymentScreen() {
  const router = useRouter();
  const { access, profile } = useLedger();
  const [subscription, setSubscription] = useState<StoreSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const plan = plans[0];

  const refresh = useCallback(() => {
    if (!profile.id) {
      setLoading(false);
      return;
    }
    getStoreSubscription({ appUserID: profile.id, displayName: profile.name })
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false));
  }, [profile.id, profile.name]);

  // Fresh on open, and again when coming back from the store's page.
  useFocusEffect(refresh);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => listener.remove();
  }, [refresh]);

  const ready = subscription !== null;
  const active = Boolean(subscription?.active);
  const willRenew = Boolean(subscription?.willRenew);
  const until = subscription?.expiresAt ? formatFullDate(subscription.expiresAt) : null;
  const manageUrl = subscription?.manageUrl ?? storeSubscriptionsUrl();

  const openStore = () => void Linking.openURL(manageUrl);

  const toggleAutoPay = (next: boolean) => {
    Alert.alert(
      next ? 'Turn auto-pay on' : 'Turn auto-pay off',
      next
        ? `${STORE_NAME} will open. Tap Resubscribe and your saved payment is charged ${plan.monthly} each month.`
        : `${STORE_NAME} will open. Tap Cancel subscription.${until ? ` You keep Lancer until ${until}, and nothing more is charged.` : ''}`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: `Open ${STORE_NAME}`, onPress: openStore },
      ]
    );
  };

  const status = loading
    ? 'Checking…'
    : !ready
      ? 'Payments open once Lancer is in the store'
      : active
        ? willRenew
          ? `Renews ${until ?? 'monthly'}`
          : `Auto-pay off · ends ${until ?? 'soon'}`
        : access.subscriptionStatus === 'trialing'
          ? `Free trial · ${access.trialDaysRemaining} ${access.trialDaysRemaining === 1 ? 'day' : 'days'} left`
          : 'Not subscribed';

  return (
    <Screen
      header
      footer={
        active ? undefined : (
          <Button icon="ribbon-outline" label={`Subscribe · ${plan.monthly}/month`} onPress={() => router.push('/upgrade')} />
        )
      }>
      <Card tone="primary">
        <Text tone="inverseMuted" variant="small">
          Lancer
        </Text>
        <Text tone="inverse" variant="title">
          {plan.monthly}/month
        </Text>
        <Text tone="inverseMuted" variant="small">
          {status}
        </Text>
      </Card>

      <List>
        <Row
          chevron={ready}
          icon="card-outline"
          onPress={ready ? openStore : undefined}
          subtitle={active ? `Saved in ${STORE_NAME}. Tap to change it.` : `Saved in ${STORE_NAME} when you subscribe.`}
          title="Payment method"
          value={STORE_NAME}
        />
        <SwitchRow
          disabled={!active}
          icon="repeat-outline"
          onValueChange={toggleAutoPay}
          subtitle={
            active
              ? willRenew
                ? `Charged ${plan.monthly} each month until you turn it off.`
                : 'Off. Lancer stops when this month ends.'
              : 'Comes on when you subscribe.'
          }
          title="Auto-pay"
          value={willRenew}
        />
      </List>

      <Text align="center" tone="faint" variant="caption">
        {`Your card is kept safely by ${STORE}, not by Lancer. Turn auto-pay off any time; you keep Lancer until the month you paid for ends.`}
      </Text>
    </Screen>
  );
}
