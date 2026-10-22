import { PlanTier, PaymentMethodStatus, SubscriptionStatus, SubscriptionStore } from '@/types/ledger';

import { getSupabaseClient } from './client';

export type BillingProfilePatch = {
  activePlan?: PlanTier;
  billingSetupComplete?: boolean;
  paymentMethodStatus?: PaymentMethodStatus;
  stripeCustomerId?: string | null;
  stripeDefaultPaymentMethodId?: string | null;
  subscriptionProductId?: string | null;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionStore?: SubscriptionStore | null;
};

export interface StripeSetupSession {
  currentPaymentMethod?: {
    brand: string | null;
    last4: string | null;
  } | null;
  customerEphemeralKeySecret: string;
  customerId: string;
  merchantDisplayName: string;
  setupIntentClientSecret: string;
}

const missingProfilesColumnPattern = /Could not find the '([^']+)' column of 'profiles' in the schema cache/i;

function normalizeBillingSchemaError(message: string) {
  if (!missingProfilesColumnPattern.test(message)) {
    return message;
  }

  return 'Supabase billing columns are still missing. Run 20260422_0004_launch_access.sql and 20260424_0007_billing_runtime.sql, then try again.';
}

function mapBillingPatchToProfileUpdate(patch: BillingProfilePatch) {
  return {
    active_plan: patch.activePlan,
    billing_setup_complete: patch.billingSetupComplete,
    payment_method_status: patch.paymentMethodStatus,
    stripe_customer_id: patch.stripeCustomerId,
    stripe_default_payment_method_id: patch.stripeDefaultPaymentMethodId,
    subscription_product_id: patch.subscriptionProductId,
    subscription_status: patch.subscriptionStatus,
    subscription_store: patch.subscriptionStore,
  };
}

export async function persistBillingProfile(patch: BillingProfilePatch) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }

  const { data, error } = await supabase.auth.getUser();
  const user = data.user;

  if (error || !user) {
    throw new Error('You need to be signed in to update billing.');
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(mapBillingPatchToProfileUpdate(patch))
    .eq('id', user.id);

  if (updateError) {
    throw new Error(normalizeBillingSchemaError(updateError.message));
  }
}

export async function prepareStripeSetupSession(plan: PlanTier) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }

  const { data, error } = await supabase.functions.invoke('stripe-billing', {
    body: {
      action: 'prepare-setup-intent',
      plan,
    },
  });

  if (error) {
    throw new Error(normalizeBillingSchemaError(error.message));
  }

  if (data?.error) {
    throw new Error(normalizeBillingSchemaError(data.error));
  }

  return data as StripeSetupSession;
}

export async function finalizeStripeSetupSession(params: {
  plan: PlanTier;
  setupIntentClientSecret: string;
}) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase client is not initialized.');
  }

  const { data, error } = await supabase.functions.invoke('stripe-billing', {
    body: {
      action: 'finalize-setup-intent',
      plan: params.plan,
      setupIntentClientSecret: params.setupIntentClientSecret,
    },
  });

  if (error) {
    throw new Error(normalizeBillingSchemaError(error.message));
  }

  if (data?.error) {
    throw new Error(normalizeBillingSchemaError(data.error));
  }

  return data as {
    brand: string | null;
    last4: string | null;
    paymentMethodId: string;
    stripeCustomerId: string;
  };
}
