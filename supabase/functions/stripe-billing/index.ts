/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'npm:stripe@18.4.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripeApiVersion = '2026-02-25.clover';
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceRoleKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? '';
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function ensureRequiredEnvironment() {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    throw new Error('Supabase function environment is incomplete.');
  }

  if (!stripeSecretKey) {
    throw new Error('Stripe secret key is missing.');
  }
}

async function getAuthenticatedUser(request: Request) {
  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
  });

  const {
    data: { user },
    error,
  } = await userSupabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user;
}

async function getProfile(adminSupabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await adminSupabase
    .from('profiles')
    .select(
      'id, full_name, active_plan, stripe_customer_id, stripe_default_payment_method_id, payment_method_status'
    )
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to load billing profile.');
  }

  return data;
}

function parseSetupIntentId(clientSecret: string) {
  return clientSecret.split('_secret_')[0]?.trim() ?? '';
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    ensureRequiredEnvironment();

    const user = await getAuthenticatedUser(request);
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: stripeApiVersion,
    });
    const body = await request.json();
    const action = typeof body?.action === 'string' ? body.action : '';
    const plan = typeof body?.plan === 'string' ? body.plan : null;
    const profile = await getProfile(adminSupabase, user.id);

    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: {
          app: 'LedgerPilot',
          supabase_user_id: user.id,
        },
        name: profile.full_name,
      });

      customerId = customer.id;

      const { error: customerUpdateError } = await adminSupabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', user.id);

      if (customerUpdateError) {
        throw new Error(customerUpdateError.message);
      }
    }

    if (action === 'prepare-setup-intent') {
      const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: stripeApiVersion }
      );

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        metadata: {
          app: 'LedgerPilot',
          selected_plan: plan ?? profile.active_plan ?? 'Pro',
          supabase_user_id: user.id,
        },
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      let currentPaymentMethod:
        | {
            brand: string | null;
            last4: string | null;
          }
        | null = null;

      if (profile.stripe_default_payment_method_id) {
        const paymentMethod = await stripe.paymentMethods.retrieve(
          profile.stripe_default_payment_method_id
        );

        if (!('deleted' in paymentMethod) && paymentMethod.card) {
          currentPaymentMethod = {
            brand: paymentMethod.card.brand ?? null,
            last4: paymentMethod.card.last4 ?? null,
          };
        }
      }

      return jsonResponse({
        currentPaymentMethod,
        customerEphemeralKeySecret: ephemeralKey.secret,
        customerId,
        merchantDisplayName: 'LedgerPilot',
        setupIntentClientSecret: setupIntent.client_secret,
      });
    }

    if (action === 'finalize-setup-intent') {
      const setupIntentClientSecret =
        typeof body?.setupIntentClientSecret === 'string' ? body.setupIntentClientSecret : '';

      if (!setupIntentClientSecret) {
        throw new Error('Missing setupIntentClientSecret.');
      }

      const setupIntentId = parseSetupIntentId(setupIntentClientSecret);

      if (!setupIntentId) {
        throw new Error('Invalid setup intent client secret.');
      }

      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

      if (setupIntent.customer !== customerId) {
        throw new Error('This setup intent belongs to another customer.');
      }

      if (setupIntent.status !== 'succeeded' || typeof setupIntent.payment_method !== 'string') {
        throw new Error('Stripe has not confirmed the card setup yet.');
      }

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: setupIntent.payment_method,
        },
      });

      const paymentMethod = await stripe.paymentMethods.retrieve(setupIntent.payment_method);

      if ('deleted' in paymentMethod || !paymentMethod.card) {
        throw new Error('The saved card details could not be retrieved.');
      }

      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({
          active_plan: plan ?? profile.active_plan ?? 'Pro',
          billing_setup_complete: true,
          payment_method_status: 'ready',
          stripe_customer_id: customerId,
          stripe_default_payment_method_id: setupIntent.payment_method,
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return jsonResponse({
        brand: paymentMethod.card.brand ?? null,
        last4: paymentMethod.card.last4 ?? null,
        paymentMethodId: setupIntent.payment_method,
        stripeCustomerId: customerId,
      });
    }

    throw new Error('Unsupported billing action.');
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown Stripe billing error' },
      400
    );
  }
});
