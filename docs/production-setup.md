# LedgerPilot Production Setup

This is the cutover path from the current seeded MVP to a real finance product.

## Recommended launch stack

- Mobile app: Expo React Native
- Auth, Postgres, storage, row-level security: Supabase
- Bank and card linking: Plaid
- App subscriptions: RevenueCat
- Push: Expo Notifications
- Crash monitoring: Sentry
- Receipt OCR worker: Mindee or another server-side OCR provider

This stack is intentionally practical for a founder-led launch. It is not the only valid architecture, but it is the fastest honest path from demo to paying users.

## What to build first

1. Real authentication
2. Real database tables
3. Receipt file storage
4. Transaction sync pipeline
5. Subscription gating
6. Notifications and monitoring

Do not start with AI, automation, or advanced tax logic. The first production milestone is simple: real users can sign up, save data safely, and come back to it on another device.

## Phase 1: Create your hosted services

### 1. Supabase

Create a new Supabase project for:

- Auth
- Postgres
- Storage
- Row-level security

Then run the SQL migration in:

- [supabase/migrations/20260419_0001_ledgerpilot_core.sql](/C:/Users/HOME%20PC/Documents/newapp/supabase/migrations/20260419_0001_ledgerpilot_core.sql)

What it gives you:

- `profiles`
- `connected_accounts`
- `transactions`
- `receipts`
- `mileage_trips`
- `quarter_snapshots`
- `audit_events`

### 2. Plaid

Create a Plaid account and start in sandbox mode first.

What Plaid should do in v1:

- generate link tokens
- exchange public tokens server-side
- store read-only account metadata
- sync bank transactions into `transactions`

Do not put Plaid secrets in the Expo app.

### 3. RevenueCat

Use RevenueCat to manage:

- Lite
- Pro
- Tax+

This keeps App Store and Play billing saner than writing subscription logic twice yourself.

### 4. Sentry

Add crash and error monitoring before you onboard beta users. Finance apps need visibility from day one.

## Phase 2: Fill your environment variables

Copy `.env.example` to `.env` and start with:

```bash
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_BACKEND_MODE=supabase
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
EXPO_PUBLIC_PLAID_ENV=sandbox
```

Keep server-only secrets out of the mobile client.

For receipt OCR in this codebase, the backend also expects:

```bash
MINDEE_API_KEY=...
MINDEE_RECEIPT_MODEL_ID=...
```

## Phase 3: Configure mobile builds

This repo now includes:

- [eas.json](/C:/Users/HOME%20PC/Documents/newapp/eas.json)

Use these build profiles:

- `development`: device testing and local iteration
- `preview`: internal testers and founder beta
- `production`: App Store and Play Store release builds

## Phase 4: Replace the seeded provider safely

Do not rewrite the whole app at once.

Replace it in this order:

1. Auth flow
2. Profile and onboarding
3. Transactions
4. Receipts
5. Mileage
6. Quarter snapshots

The mapping helpers for that migration live in:

- [lib/backend/mappers.ts](/C:/Users/HOME%20PC/Documents/newapp/lib/backend/mappers.ts)
- [lib/backend/payloads.ts](/C:/Users/HOME%20PC/Documents/newapp/lib/backend/payloads.ts)
- [types/database.ts](/C:/Users/HOME%20PC/Documents/newapp/types/database.ts)

## Your exact next moves

1. Create the Supabase project.
2. Run the migration SQL.
3. Add your Supabase URL and publishable key to `.env`.
4. Tell me to wire Supabase auth into `signup`, `login`, and `LedgerProvider`.
5. After auth works, we will swap transactions off seeded data.

## Official docs

- Expo EAS Build: [docs.expo.dev/build/introduction](https://docs.expo.dev/build/introduction/)
- Expo environment variables: [docs.expo.dev/guides/environment-variables](https://docs.expo.dev/guides/environment-variables/)
- Expo notifications: [docs.expo.dev/push-notifications/overview](https://docs.expo.dev/push-notifications/overview/)
- Supabase React Native quickstart: [supabase.com/docs/guides/getting-started/quickstarts/react-native](https://supabase.com/docs/guides/getting-started/quickstarts/react-native)
- Supabase row-level security: [supabase.com/docs/guides/database/postgres/row-level-security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Plaid quickstart: [plaid.com/docs/quickstart](https://plaid.com/docs/quickstart/)
- RevenueCat React Native: [revenuecat.com/docs/getting-started/installation/reactnative](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
- Sentry for Expo and React Native: [docs.sentry.io/platforms/react-native/manual-setup/expo](https://docs.sentry.io/platforms/react-native/manual-setup/expo/)
