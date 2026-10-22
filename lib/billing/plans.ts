import type { PurchasesOffering, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';

import { env } from '@/lib/config/env';
import { PlanTier, SubscriptionStatus, SubscriptionStore } from '@/types/ledger';

export type BillingCadence = 'monthly' | 'annual';

export type RevenueCatPlanCatalogItem = {
  annual: PurchasesPackage | null;
  annualLabel: string | null;
  description: string;
  monthly: PurchasesPackage | null;
  monthlyLabel: string | null;
  offeringId: string;
  plan: PlanTier;
};

export type RevenueCatSyncContext = {
  currentPlan: PlanTier;
  currentSubscriptionStatus: SubscriptionStatus;
  fallbackPlan?: PlanTier;
  trialEndsAt: string | null;
};

export type RevenueCatProfileSync = {
  activePlan: PlanTier;
  subscriptionProductId: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStore: SubscriptionStore | null;
};

const planKeywordMap: Record<PlanTier, string[]> = {
  Lite: ['lite', 'starter', 'essentials', 'basic'],
  Pro: ['pro', 'growth', 'standard', 'plus'],
  'Tax+': ['taxplus', 'tax+', 'tax', 'filing', 'premium'],
};

const explicitProductMap: Partial<Record<PlanTier, string>> = {
  Lite: env.revenueCatLiteProductId,
  Pro: env.revenueCatProProductId,
  'Tax+': env.revenueCatTaxPlusProductId,
};

function normalizeText(value: string | null | undefined) {
  return value?.toLowerCase().replace(/[^a-z0-9]+/g, '') ?? '';
}

function includesKeyword(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(normalizeText(keyword)));
}

function inferPlanFromStrings(values: (string | null | undefined)[]): PlanTier | null {
  const normalizedValues = values.map((value) => normalizeText(value)).filter(Boolean);

  for (const plan of ['Lite', 'Pro', 'Tax+'] as const) {
    const expectedProductId = explicitProductMap[plan];

    if (expectedProductId && normalizedValues.includes(normalizeText(expectedProductId))) {
      return plan;
    }
  }

  for (const plan of ['Lite', 'Tax+', 'Pro'] as const) {
    if (normalizedValues.some((value) => includesKeyword(value, planKeywordMap[plan]))) {
      return plan;
    }
  }

  return null;
}

function inferPlanFromPackage(aPackage: PurchasesPackage): PlanTier | null {
  return inferPlanFromStrings([
    aPackage.identifier,
    aPackage.product.identifier,
    aPackage.product.title,
    aPackage.product.description,
    aPackage.presentedOfferingContext?.offeringIdentifier,
  ]);
}

function inferPlanFromOffering(offering: PurchasesOffering): PlanTier | null {
  const metadataValues = [
    offering.metadata.plan,
    offering.metadata.tier,
    offering.metadata.slug,
    offering.metadata.product,
  ].map((value) => (typeof value === 'string' ? value : null));

  return (
    inferPlanFromStrings([
      offering.identifier,
      offering.serverDescription,
      ...metadataValues,
    ]) ??
    offering.availablePackages
      .map(inferPlanFromPackage)
      .find((plan): plan is PlanTier => Boolean(plan)) ??
    null
  );
}

function labelForPackage(aPackage: PurchasesPackage | null) {
  return aPackage?.product.priceString ?? null;
}

function findPackageByCadence(
  offering: PurchasesOffering,
  cadence: BillingCadence
): PurchasesPackage | null {
  if (cadence === 'monthly') {
    return (
      offering.monthly ??
      offering.availablePackages.find((aPackage) => aPackage.packageType === 'MONTHLY') ??
      null
    );
  }

  return (
    offering.annual ??
    offering.availablePackages.find((aPackage) => aPackage.packageType === 'ANNUAL') ??
    null
  );
}

function defaultPlanDescription(plan: PlanTier) {
  switch (plan) {
    case 'Lite':
      return 'Clean manual tracking for expenses, receipts, and mileage.';
    case 'Tax+':
      return 'Best for filing season, complex returns, and deeper support.';
    case 'Pro':
    default:
      return 'The full clarity dashboard for freelancers and creators.';
  }
}

export function buildRevenueCatPlanCatalog(
  offerings: PurchasesOfferings
): RevenueCatPlanCatalogItem[] {
  const byPlan = new Map<PlanTier, RevenueCatPlanCatalogItem>();
  const allOfferings = Object.values(offerings.all);

  for (const offering of allOfferings) {
    const plan = inferPlanFromOffering(offering);

    if (!plan) {
      continue;
    }

    const existing = byPlan.get(plan);
    const monthly = existing?.monthly ?? findPackageByCadence(offering, 'monthly');
    const annual = existing?.annual ?? findPackageByCadence(offering, 'annual');

    byPlan.set(plan, {
      annual,
      annualLabel: labelForPackage(annual),
      description:
        offering.serverDescription?.trim() || existing?.description || defaultPlanDescription(plan),
      monthly,
      monthlyLabel: labelForPackage(monthly),
      offeringId: existing?.offeringId ?? offering.identifier,
      plan,
    });
  }

  return (['Lite', 'Pro', 'Tax+'] as const)
    .map((plan) => byPlan.get(plan))
    .filter((item): item is RevenueCatPlanCatalogItem => Boolean(item));
}

export function getCatalogPackageForCadence(
  item: RevenueCatPlanCatalogItem,
  cadence: BillingCadence
) {
  return cadence === 'annual' ? item.annual : item.monthly;
}

function mapStore(value: string | null | undefined): SubscriptionStore | null {
  switch (value) {
    case 'PLAY_STORE':
    case 'APP_STORE':
    case 'STRIPE':
    case 'RC_BILLING':
      return value;
    default:
      return value ? 'UNKNOWN' : null;
  }
}

export function deriveRevenueCatProfileSync(
  activeEntitlement:
    | {
        productIdentifier: string;
        store: string;
      }
    | undefined,
  context: RevenueCatSyncContext
): RevenueCatProfileSync {
  if (activeEntitlement) {
    return {
      activePlan:
        inferPlanFromStrings([activeEntitlement.productIdentifier]) ??
        context.fallbackPlan ??
        context.currentPlan,
      subscriptionProductId: activeEntitlement.productIdentifier,
      subscriptionStatus: 'active',
      subscriptionStore: mapStore(activeEntitlement.store),
    };
  }

  const trialStillRunning =
    context.currentSubscriptionStatus === 'trialing' &&
    Boolean(context.trialEndsAt) &&
    new Date(context.trialEndsAt as string).getTime() > Date.now();

  return {
    activePlan: context.fallbackPlan ?? context.currentPlan,
    subscriptionProductId: null,
    subscriptionStatus: trialStillRunning ? 'trialing' : 'expired',
    subscriptionStore: null,
  };
}
