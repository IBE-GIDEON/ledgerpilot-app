import { useStripe } from '@stripe/stripe-react-native';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button, Card, Screen, Segmented, Text } from '@/components/ds';
import { plans } from '@/lib/billing/features';
import { env } from '@/lib/config/env';
import { finalizeStripeSetupSession, prepareStripeSetupSession } from '@/lib/supabase/billing';
import { useLedger } from '@/providers/ledger-provider';
import { PlanTier } from '@/types/ledger';

const tiers = plans.map((plan) => plan.tier);

/** One job: save a card for the chosen plan. Nothing is charged today. */
export default function BillingSetupScreen() {
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { access, actions, activePlan, isAuthenticated, isHydratingAuth, profile } = useLedger();
  const stripeReady = Boolean(env.stripePublishableKey);

  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(activePlan);
  const [savingCard, setSavingCard] = useState(false);

  if (isHydratingAuth) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  const plan = plans.find((item) => item.tier === selectedPlan) ?? plans[0];
  const cardSaved = access.paymentMethodStatus === 'ready';

  const handleSaveCard = async () => {
    if (!stripeReady) {
      Alert.alert(
        'Card setup isn’t available yet',
        'Payments aren’t connected in this build. Once Stripe is set up, you can add a card here.'
      );
      return;
    }

    try {
      setSavingCard(true);
      const session = await prepareStripeSetupSession(selectedPlan);
      const initResult = await initPaymentSheet({
        allowsDelayedPaymentMethods: false,
        customerEphemeralKeySecret: session.customerEphemeralKeySecret,
        customerId: session.customerId,
        defaultBillingDetails: {
          name: profile.name,
        },
        merchantDisplayName: session.merchantDisplayName,
        setupIntentClientSecret: session.setupIntentClientSecret,
      });

      if (initResult.error) {
        throw new Error(initResult.error.message);
      }

      const presentResult = await presentPaymentSheet();

      if (presentResult.error) {
        if (presentResult.error.code === 'Canceled') {
          return;
        }

        throw new Error(presentResult.error.message);
      }

      const finalized = await finalizeStripeSetupSession({
        plan: selectedPlan,
        setupIntentClientSecret: session.setupIntentClientSecret,
      });

      await actions.completeBillingSetup({
        plan: selectedPlan,
        paymentMethodStatus: 'ready',
        withCard: true,
      });

      router.back();

      Alert.alert(
        'Card saved',
        finalized.last4
          ? `${finalized.brand ?? 'Card'} ending in ${finalized.last4} is saved for your ${selectedPlan} plan.`
          : `Your card is saved for your ${selectedPlan} plan.`
      );
    } catch (error) {
      Alert.alert(
        'Card not saved',
        error instanceof Error ? error.message : 'We couldn’t save your card right now. Try again in a moment.'
      );
    } finally {
      setSavingCard(false);
    }
  };

  return (
    <Screen
      header
      footer={
        <Button
          icon="card-outline"
          label={cardSaved ? 'Replace card' : 'Add card'}
          loading={savingCard}
          onPress={() => void handleSaveCard()}
        />
      }>
      <Card tone="primary">
        <Text tone="inverseMuted" variant="small">
          {cardSaved ? 'Card on file' : 'No card on file'}
        </Text>
        <Text tone="inverse" variant="title">
          {plan.monthly}/mo
        </Text>
        <Text tone="inverseMuted" variant="small">
          No charge today
        </Text>
      </Card>

      <Segmented onChange={setSelectedPlan} options={tiers} value={selectedPlan} />

      <Text align="center" tone="faint" variant="caption">
        Secured by Stripe. We remind you before any charge.
      </Text>
    </Screen>
  );
}
