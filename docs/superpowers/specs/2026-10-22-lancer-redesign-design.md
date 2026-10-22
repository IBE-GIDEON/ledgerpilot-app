# Lancer redesign

Date: 2026-10-22
Status: approved in chat (look, images, navigation); scope extended by owner the same day.

## Goal

Turn LedgerPilot into **Lancer**: a calm, premium money-and-tax app for freelancers that opens fast, never overlaps on any phone, feels native on iPhone and Android, and puts the features people pay for front and centre. The owner must be able to walk through the whole app (onboarding included) in Expo Go before Supabase, Plaid, Stripe or RevenueCat are connected.

## Decisions

| Area | Decision |
| --- | --- |
| Display name | Lancer. Bundle IDs, `ledgerpilot://` scheme, storage keys and Supabase tables stay unchanged until store release. |
| Look | "Private bank": deep green `#12372A`, paper `#F7F5F0`, ink `#1C1C1A`, brass accent `#A8875A`. Dark: `#0E1512` base. Red/green only for money direction. |
| Type | Source Serif 4 for amounts and screen titles, Inter for UI, tabular digits. Loaded with `@expo-google-fonts/*`. |
| Shape | Hairline borders, flat surfaces, 12px cards, 10px controls, 4px spacing grid. No blobs, glows, emoji, gradients or auto-advancing carousels. |
| Navigation | `expo-router/unstable-native-tabs`: SF Symbols on iOS, Material Symbols on Android. Stacks use native headers and gestures. |
| Images | ~8 Unsplash photos bundled as WebP (~150 KB each), with focal points and a green tint. Each file listed for owner OK before download. |
| Preview | `EXPO_PUBLIC_BACKEND_MODE=mock` runs fully local with seeded data. Welcome screen has "Explore without an account". No screen blocks on billing. |

## Information architecture

Tabs (5):

1. **Home**: safe-to-spend, net profit this month, tax set aside vs target, next quarterly payment, items needing review (uncategorised transactions, unverified receipts, unclassified trips), quick add.
2. **Money**: segmented Transactions | Receipts. Search, filter, deductible toggle, category, attach receipt. Virtualised lists.
3. **Mileage**: trips list, add trip, classify, year-to-date deduction at the IRS rate, auto-tracking toggle (development build only).
4. **Taxes**: quarterly estimates and due dates, reserve percent, deductions by category, Schedule C summary, CPA packet export.
5. **Account**: profile, plan and billing, connected accounts, notifications, appearance, support, privacy, terms, sign out, delete account.

Stack screens: transaction create (sheet), transaction detail, receipt add, trip add, connected accounts, bank link, plan (paywall), profile edit, notifications, support, privacy, terms, delete account, CPA packet.

Every screen is reachable from somewhere. Previously unreachable screens (connections, privacy, terms, receipts) are linked from Account and Money.

## What people pay for

Free (Lite): manual transactions, receipts and trips, monthly summary.

Pro: bank sync, receipt scanning, quarterly estimates and reminders, tax set-aside, Schedule C summary, auto mileage.

Tax+: everything in Pro plus the CPA-ready year-end packet and priority support.

Locked features show a quiet lock and open the Plan sheet. Nothing hard-blocks the app; card entry is optional and lives under Account → Plan.

## What is removed

- 2.4 s fake launch screen (native splash covers font/data load instead).
- Auto-advancing hero slider and feature carousel on welcome.
- Billing setup as a mandatory step before the app.
- Seeded "deduction insights" marketing cards on Home (replaced by real "needs review" counts).
- Decorative ambient orbs, brand waves and emoji.
- Duplicate entry points (separate Tax and Reports tabs merge into Taxes).

## Performance

- Native tabs (no JS tab bar re-render).
- `FlatList` for transactions, receipts and trips; memoised rows.
- Ledger context split into data/derived/actions so action-only consumers don't re-render on data changes.
- `expo-image` for photos with `cachePolicy="memory-disk"`.
- No timers on mount; no layout-driven re-renders.

## Layout rules (no overlap)

- One `Screen` component owns safe area, keyboard avoidance, scroll and horizontal padding: 16 (<375pt), 20 (default), centred 640 max width on tablets.
- No hard-coded bottom padding. Native tabs inset scroll views automatically (`contentInsetAdjustmentBehavior="automatic"` on iOS).
- Amounts use `adjustsFontSizeToFit` with a floor; rows truncate secondary text with `numberOfLines`.
- Touch targets ≥ 44pt.

## External services (later)

`lib/config/env.ts` stays the single switch. Each integration has one adapter file: `lib/supabase/*`, `lib/billing/revenuecat.ts`, bank-link Plaid loader, Stripe init in the root layout. In mock mode they are never called. Adding a service = fill `.env` + flip `EXPO_PUBLIC_BACKEND_MODE=supabase`.

## Testing

- `npm run typecheck` and an `expo export` bundle for iOS and Android after every batch.
- Owner checks each batch in Expo Go on their phone.
- Walkthrough: welcome → explore → every tab → every stack screen → back, in light and dark, small and large phone.
