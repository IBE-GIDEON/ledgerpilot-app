export type BackendMode = 'mock' | 'supabase';

function readPublicEnv(name: string) {
  return process.env[name]?.trim();
}

function readBackendMode(): BackendMode {
  const value = readPublicEnv('EXPO_PUBLIC_BACKEND_MODE');
  return value === 'supabase' ? 'supabase' : 'mock';
}

export const env = {
  appEnv: readPublicEnv('EXPO_PUBLIC_APP_ENV') ?? 'development',
  backendMode: readBackendMode(),
  supabaseUrl: readPublicEnv('EXPO_PUBLIC_SUPABASE_URL') ?? '',
  supabasePublishableKey: readPublicEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ?? '',
  plaidEnv: readPublicEnv('EXPO_PUBLIC_PLAID_ENV') ?? 'sandbox',
  sentryDsn: readPublicEnv('EXPO_PUBLIC_SENTRY_DSN') ?? '',
  stripePublishableKey: readPublicEnv('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY') ?? '',
  revenueCatAppleApiKey: readPublicEnv('EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY') ?? '',
  revenueCatGoogleApiKey: readPublicEnv('EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY') ?? '',
  revenueCatEntitlementId: readPublicEnv('EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID') ?? '',
  revenueCatLiteProductId: readPublicEnv('EXPO_PUBLIC_REVENUECAT_LITE_PRODUCT_ID') ?? '',
  revenueCatProProductId: readPublicEnv('EXPO_PUBLIC_REVENUECAT_PRO_PRODUCT_ID') ?? '',
  revenueCatTaxPlusProductId: readPublicEnv('EXPO_PUBLIC_REVENUECAT_TAXPLUS_PRODUCT_ID') ?? '',
} as const;

/** Features that ship turned off until their outside service is approved. */
export const featureFlags = {
  // Plaid production access takes weeks; v1 launches with manual entry only.
  bankSync: readPublicEnv('EXPO_PUBLIC_BANK_SYNC') === 'on',
} as const;

export const usingSupabaseBackend =
  env.backendMode === 'supabase' &&
  Boolean(env.supabaseUrl) &&
  Boolean(env.supabasePublishableKey);
