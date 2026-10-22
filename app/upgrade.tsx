import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { List, Photo, Row, Screen, Segmented, Text } from '@/components/ds';
import { PlanCard } from '@/components/plans/plan-card';
import { photos } from '@/constants/images';
import { space } from '@/constants/theme';
import { plans } from '@/lib/billing/features';
import {
  BillingCadence,
  getCatalogPackageForCadence,
  RevenueCatPlanCatalogItem,
} from '@/lib/billing/plans';
import {
  buildRevenueCatSyncFromCustomerInfo,
  isRevenueCatAvailable,
  loadRevenueCatCatalog,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from '@/lib/billing/revenuecat';
import { persistBillingProfile } from '@/lib/supabase/billing';
import { useLedger } from '@/providers/ledger-provider';
import { PlanTier } from '@/types/ledger';

const cadences = ['monthly', 'annual'] as const satisfies readonly BillingCadence[];
const cadenceLabels: Record<BillingCadence, string> = { monthly: 'Monthly', annual: 'Annual' };

/** One job: pick a plan (monthly or annual) and buy it. */
export default function UpgradeScreen() {
  const router = useRouter();
  const { access, actions, activePlan, profile } = useLedger();
  const [billingCadence, setBillingCadence] = useState<BillingCadence>('annual');
  const [catalog, setCatalog] = useState<RevenueCatPlanCatalogItem[]>([]);
  const [pendingPlan, setPendingPlan] = useState<PlanTier | null>(null);
  const [restoring, setRestoring] = useState(false);

  const revenueCatReady = isRevenueCatAvailable();
  const catalogByPlan = useMemo(
    () => new Map(catalog.map((item) => [item.plan, item])),
    [catalog]
  );

  const syncCustomerInfo = useCallback(
    async (customerInfo: Awaited<ReturnType<typeof restoreRevenueCatPurchases>>, fallbackPlan?: PlanTier) => {
      const sync = buildRevenueCatSyncFromCustomerInfo(customerInfo, {
        currentPlan: activePlan,
        currentSubscriptionStatus: access.subscriptionStatus,
        fallbackPlan,
        trialEndsAt: access.trialEndsAt,
      });

      await persistBillingProfile({
        activePlan: sync.activePlan,
        billingSetupComplete: sync.subscriptionStatus === 'active' ? true : access.billingSetupComplete,
        subscriptionProductId: sync.subscriptionProductId,
        subscriptionStatus: sync.subscriptionStatus,
        subscriptionStore: sync.subscriptionStore,
      });

      await actions.refreshData();
      return sync;
    },
    [
      access.billingSetupComplete,
      access.subscriptionStatus,
      access.trialEndsAt,
      actions,
      activePlan,
    ]
  );

  useEffect(() => {
    let active = true;

    const hydrateCatalog = async () => {
      if (!revenueCatReady || !profile.id) {
        setCatalog([]);
        return;
      }

      try {
        const response = await loadRevenueCatCatalog({
          appUserID: profile.id,
          displayName: profile.name,
        });

        if (!active) {
          return;
        }

        setCatalog(response.catalog);

        const hasActiveEntitlement = Boolean(
          response.customerInfo && Object.keys(response.customerInfo.entitlements.active).length > 0
        );

        if (
          response.customerInfo &&
          (hasActiveEntitlement || access.subscriptionStatus === 'active' || access.isBlocked)
        ) {
          await syncCustomerInfo(response.customerInfo);
        }
      } catch (error) {
        if (active) {
          Alert.alert(
            'Billing did not load',
            error instanceof Error
              ? error.message
              : 'We could not load live subscription options right now.'
          );
        }
      }
    };

    void hydrateCatalog();

    return () => {
      active = false;
    };
  }, [
    access.isBlocked,
    access.subscriptionStatus,
    profile.id,
    profile.name,
    revenueCatReady,
    syncCustomerInfo,
  ]);

  const handleChoosePlan = async (plan: PlanTier) => {
    const liveCatalog = catalogByPlan.get(plan);
    const aPackage = liveCatalog ? getCatalogPackageForCadence(liveCatalog, billingCadence) : null;

    if (!revenueCatReady || !aPackage) {
      await actions.setActivePlan(plan);
      Alert.alert(
        'Plan saved',
        revenueCatReady
          ? 'That live billing option is not mapped in RevenueCat yet, so Lancer saved your preferred plan for later.'
          : 'RevenueCat keys are not in this build yet, so Lancer saved your preferred plan for later.'
      );
      return;
    }

    try {
      setPendingPlan(plan);
      const customerInfo = await purchaseRevenueCatPackage({
        aPackage,
        appUserID: profile.id,
        displayName: profile.name,
      });

      const sync = await syncCustomerInfo(customerInfo, plan);
      Alert.alert(
        'Subscription active',
        sync.subscriptionStatus === 'active'
          ? `${sync.activePlan} is now active and your access is unlocked.`
          : 'Your purchase was processed, but Lancer still needs a quick status refresh.'
      );
    } catch (error) {
      Alert.alert(
        'Purchase did not finish',
        error instanceof Error ? error.message : 'We could not complete that purchase right now.'
      );
    } finally {
      setPendingPlan(null);
    }
  };

  const handleRestore = async () => {
    if (!revenueCatReady) {
      Alert.alert(
        'Restore unavailable',
        'RevenueCat is not configured in this build yet, so there is nothing to restore here.'
      );
      return;
    }

    try {
      setRestoring(true);
      const customerInfo = await restoreRevenueCatPurchases({
        appUserID: profile.id,
        displayName: profile.name,
      });

      const sync = await syncCustomerInfo(customerInfo);

      Alert.alert(
        sync.subscriptionStatus === 'active' ? 'Access restored' : 'Nothing active found',
        sync.subscriptionStatus === 'active'
          ? `${sync.activePlan} is active again on this device.`
          : 'We did not find an active store subscription for this account yet.'
      );
    } catch (error) {
      Alert.alert(
        'Restore failed',
        error instanceof Error ? error.message : 'We could not restore purchases right now.'
      );
    } finally {
      setRestoring(false);
    }
  };

  const trialLine = (() => {
    if (access.subscriptionStatus === 'active') {
      return null;
    }

    if (access.isBlocked) {
      return 'Trial ended';
    }

    if (access.subscriptionStatus === 'trialing') {
      const days = access.trialDaysRemaining;
      return `${days} trial day${days === 1 ? '' : 's'} left`;
    }

    return null;
  })();

  const isCurrentPlan = (tier: PlanTier) =>
    activePlan === tier && (access.subscriptionStatus === 'active' || !revenueCatReady);

  const proIsCurrent = isCurrentPlan('Pro');

  return (
    <Screen header>
      <Photo
        accessibilityLabel={photos.plans.alt}
        aspectRatio={2.4}
        focus={photos.plans.focus}
        source={photos.plans.source}
      />
      <View style={styles.intro}>
        {trialLine ? (
          <Text variant="smallMedium" tone={access.isBlocked ? 'negative' : 'primary'}>
            {trialLine}
          </Text>
        ) : null}
        <Segmented
          labels={cadenceLabels}
          onChange={setBillingCadence}
          options={cadences}
          value={billingCadence}
        />
      </View>

      <View style={styles.plans}>
        {plans.map((plan) => {
          const current = isCurrentPlan(plan.tier);
          const livePlan = catalogByPlan.get(plan.tier);
          const price =
            billingCadence === 'annual'
              ? livePlan?.annualLabel ?? plan.annual
              : livePlan?.monthlyLabel ?? plan.monthly;

          return (
            <PlanCard
              key={plan.tier}
              buttonLabel={current ? 'Current' : `Choose ${plan.tier}`}
              disabled={pendingPlan !== null && pendingPlan !== plan.tier}
              emphasis={plan.tier === 'Pro' && !proIsCurrent}
              features={plan.features}
              isCurrent={current}
              loading={pendingPlan === plan.tier}
              onChoose={() => void handleChoosePlan(plan.tier)}
              period={billingCadence === 'annual' ? '/ year' : '/ month'}
              price={price}
              recommended={plan.tier === 'Pro'}
              summary={plan.summary}
              tier={plan.tier}
            />
          );
        })}
      </View>

      <List>
        <Row
          chevron
          icon="card-outline"
          onPress={() => router.push('/billing-setup')}
          title="Payment method"
        />
        <Row
          icon="refresh-outline"
          onPress={restoring ? undefined : () => void handleRestore()}
          subtitle={restoring ? 'Restoring' : undefined}
          title="Restore purchases"
        />
      </List>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: space.md,
  },
  plans: {
    gap: space.lg,
  },
});
