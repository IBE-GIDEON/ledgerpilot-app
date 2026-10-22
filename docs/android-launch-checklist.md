# LedgerPilot Android Launch Checklist

This app is now code-ready for an Android-first launch flow with:

- email and Google auth
- onboarding
- dashboard, transactions, mileage, receipts, reports
- 7-day trial gating
- pricing screen
- support, privacy, terms, and delete-account entry points

Before a real public launch, finish these external steps.

## 1. Run the latest Supabase migration

Open Supabase SQL Editor and run:

- `supabase/migrations/20260422_0004_launch_access.sql`
- `supabase/migrations/20260423_0005_bank_connection_security.sql`

This adds:

- `billing_setup_complete`
- `payment_method_status`
- `subscription_status`
- `trial_started_at`
- `trial_ends_at`

## 2. Deploy the Supabase edge functions

Deploy both functions:

- `supabase/functions/plaid-bridge`
- `supabase/functions/delete-account`
- `supabase/functions/mindee-receipt`

The delete-account function needs admin-level Supabase secrets in the function environment.

## 3. Set Supabase function secrets

For `delete-account`, make sure the function has:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`

For `plaid-bridge`, make sure the function has:

- `PLAID_ENV`
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- optional: `PLAID_COUNTRY_CODES` if you want something other than the default `US`

For `mindee-receipt`, make sure the function has:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`
- `MINDEE_API_KEY`
- `MINDEE_RECEIPT_MODEL_ID`

## 4. Decide how paid plans will actually charge

The app now has:

- the 7-day trial flow
- the pricing screen
- the skippable card step
- the post-trial block

But real payment processing is still not connected.

To launch paid plans for real, choose one:

1. Stripe custom card flow
2. RevenueCat with Google Play subscriptions

Until one of those is connected, users can experience the trial logic but paid plan activation is not production-complete.

## 5. Build an Android production binary

This project already has `eas.json`.

Use:

```bash
npx eas login
npx eas build --platform android --profile production
```

If EAS asks for Android credentials, let it manage them unless you already have your own keystore.

## 6. Prepare Play Console listing items

You still need:

- app screenshots
- short description
- full description
- privacy policy URL
- support email
- data safety form answers
- subscription products in Google Play if you are charging

## 7. Final launch truth check

For the current codebase, the honest public product story is:

- global manual money tracking works
- receipts can use OCR only after the `mindee-receipt` function is deployed with its secrets
- mileage is manual entry, not auto-tracking yet
- bank linking is available for the Plaid countries you configure in the backend
- push notifications are in-app reminders right now, not native push delivery yet

If you want a stricter launch story, hide bank linking until you are ready to support more regions.
