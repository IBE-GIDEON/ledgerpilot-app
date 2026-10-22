import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesOfferings } from 'react-native-purchases';

import {
  buildRevenueCatPlanCatalog,
  deriveRevenueCatProfileSync,
  RevenueCatPlanCatalogItem,
  RevenueCatSyncContext,
} from '@/lib/billing/plans';
import { env } from '@/lib/config/env';

type RevenueCatRuntime = {
  default: {
    configure: (params: { apiKey: string; appUserID: string }) => void;
    getCustomerInfo: () => Promise<CustomerInfo>;
    getOfferings: () => Promise<PurchasesOfferings>;
    isConfigured: () => Promise<boolean>;
    logIn: (appUserID: string) => Promise<unknown>;
    logOut: () => Promise<unknown>;
    purchasePackage: (
      aPackage: RevenueCatPlanCatalogItem['monthly']
    ) => Promise<{ customerInfo: CustomerInfo }>;
    restorePurchases: () => Promise<CustomerInfo>;
    setDisplayName: (displayName: string | null) => Promise<unknown>;
    setEmail: (email: string | null) => Promise<unknown>;
    setLogLevel: (level: unknown) => Promise<unknown>;
  };
  LOG_LEVEL: {
    INFO: unknown;
  };
};

let configuredUserId: string | null = null;
let hasWarnedRevenueCatLoadFailure = false;
let revenueCatRuntimePromise: Promise<RevenueCatRuntime | null> | null = null;

function getRevenueCatApiKey() {
  if (Platform.OS === 'android') {
    return env.revenueCatGoogleApiKey;
  }

  if (Platform.OS === 'ios') {
    return env.revenueCatAppleApiKey;
  }

  return '';
}

export function isRevenueCatAvailable() {
  return Platform.OS !== 'web' && Boolean(getRevenueCatApiKey());
}

async function loadRevenueCatRuntime() {
  if (!isRevenueCatAvailable()) {
    return null;
  }

  if (!revenueCatRuntimePromise) {
    revenueCatRuntimePromise = Promise.resolve().then(() => {
      try {
        // Load RevenueCat lazily so Metro does not resolve the SDK during normal app startup.
        const dynamicRequire = globalThis.eval?.('require') as
          | ((moduleName: string) => RevenueCatRuntime)
          | undefined;

        if (!dynamicRequire) {
          throw new Error('Dynamic require is unavailable in this build.');
        }

        return dynamicRequire('react-native-purchases');
      } catch (error) {
        if (!hasWarnedRevenueCatLoadFailure) {
          hasWarnedRevenueCatLoadFailure = true;
          console.warn(
            'RevenueCat SDK could not load in this build, so live subscriptions stay disabled.',
            error instanceof Error ? error.message : error
          );
        }

        return null;
      }
    });
  }

  return revenueCatRuntimePromise;
}

export async function ensureRevenueCatConfigured(params: {
  appUserID: string;
  displayName?: string | null;
  email?: string | null;
}) {
  const apiKey = getRevenueCatApiKey();
  const runtime = await loadRevenueCatRuntime();

  if (!apiKey || Platform.OS === 'web' || !runtime) {
    return false;
  }

  const Purchases = runtime.default;

  await Purchases.setLogLevel(runtime.LOG_LEVEL.INFO).catch(() => undefined);

  const alreadyConfigured = await Purchases.isConfigured().catch(() => false);

  if (!alreadyConfigured) {
    Purchases.configure({
      apiKey,
      appUserID: params.appUserID,
    });
    configuredUserId = params.appUserID;
  } else if (configuredUserId !== params.appUserID) {
    await Purchases.logIn(params.appUserID);
    configuredUserId = params.appUserID;
  }

  await Promise.allSettled([
    params.displayName ? Purchases.setDisplayName(params.displayName) : Promise.resolve(),
    params.email ? Purchases.setEmail(params.email) : Promise.resolve(),
  ]);

  return true;
}

export async function clearRevenueCatCustomer() {
  const runtime = await loadRevenueCatRuntime();

  if (!runtime) {
    configuredUserId = null;
    return;
  }

  const Purchases = runtime.default;
  const alreadyConfigured = await Purchases.isConfigured().catch(() => false);

  if (!alreadyConfigured) {
    configuredUserId = null;
    return;
  }

  await Purchases.logOut().catch(() => undefined);
  configuredUserId = null;
}

export async function loadRevenueCatCatalog(params: {
  appUserID: string;
  displayName?: string | null;
  email?: string | null;
}) {
  const ready = await ensureRevenueCatConfigured(params);
  const runtime = await loadRevenueCatRuntime();

  if (!ready || !runtime) {
    return {
      catalog: [] as RevenueCatPlanCatalogItem[],
      customerInfo: null as CustomerInfo | null,
      offerings: null as PurchasesOfferings | null,
    };
  }

  const Purchases = runtime.default;
  const [offerings, customerInfo] = await Promise.all([
    Purchases.getOfferings(),
    Purchases.getCustomerInfo(),
  ]);

  return {
    catalog: buildRevenueCatPlanCatalog(offerings),
    customerInfo,
    offerings,
  };
}

export async function purchaseRevenueCatPackage(
  params: Parameters<typeof ensureRevenueCatConfigured>[0] & {
    aPackage: RevenueCatPlanCatalogItem['monthly'];
  }
) {
  if (!params.aPackage) {
    throw new Error('That billing option is not configured in RevenueCat yet.');
  }

  const ready = await ensureRevenueCatConfigured(params);
  const runtime = await loadRevenueCatRuntime();

  if (!ready || !runtime) {
    throw new Error('RevenueCat is not configured in this build yet.');
  }

  const Purchases = runtime.default;
  const result = await Purchases.purchasePackage(params.aPackage);
  return result.customerInfo;
}

export async function restoreRevenueCatPurchases(
  params: Parameters<typeof ensureRevenueCatConfigured>[0]
) {
  const ready = await ensureRevenueCatConfigured(params);
  const runtime = await loadRevenueCatRuntime();

  if (!ready || !runtime) {
    throw new Error('RevenueCat is not configured in this build yet.');
  }

  return runtime.default.restorePurchases();
}

export function buildRevenueCatSyncFromCustomerInfo(
  customerInfo: CustomerInfo,
  context: RevenueCatSyncContext
) {
  const activeEntitlement =
    (env.revenueCatEntitlementId
      ? customerInfo.entitlements.active[env.revenueCatEntitlementId]
      : undefined) ?? Object.values(customerInfo.entitlements.active)[0];
  return deriveRevenueCatProfileSync(activeEntitlement, context);
}
