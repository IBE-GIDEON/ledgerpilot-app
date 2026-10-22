# Lancer screen guide

How every screen in Lancer is built. Read with `2026-10-22-lancer-redesign-design.md`.

## Building blocks (use these, don't restyle from scratch)

Import from `@/components/ds`:

- `Screen` — every screen's root. Owns background, safe areas, keyboard, scroll and gutters.
  - Tab screens: `<Screen tab>`. Stack screens with a native header: `<Screen header>`. Headerless (welcome, setup): `<Screen>`.
  - Screens that render a `FlatList`: `<Screen tab scroll={false}>` and give the list `contentInsetAdjustmentBehavior="automatic"`, `contentContainerStyle={{ paddingHorizontal: useGutter(), paddingBottom: useManualInsets({tab:true}).bottom + 32 }}`.
  - Forms: `keyboard`. Pinned primary action: `footer={<Button …/>}`.
- `PageHeader` — serif title at the top of tab screens (tabs have no native header). Stack screens get their title from the native header set in `app/_layout.tsx`; don't repeat it in the body.
- `Text` (`variant`: display/title/heading/subheading/body/bodyMedium/small/smallMedium/caption; `tone`: default/muted/faint/primary/accent/positive/negative/inverse), `Overline`, `Amount` (money: serif, tabular, auto-shrinks; `signed` colours by direction).
- `Card` (`tone` surface/muted/primary), `Section` (label + optional "See all" action + footnote), `List` + `Row` (settings-style and record rows; `trailing` for amounts/badges, `chevron` for navigation), `Divider`.
- `Button` (primary/secondary/ghost/destructive, `size` small, `icon`, `loading`), `IconButton` (44pt round, needs `label`).
- `Field` (label, error, hint, prefix), `Segmented`, `Chip`, `Badge`, `Stat`, `Progress`, `EmptyState`.
- `ProGate feature="…"` wraps paid features; `useFeature(feature)` for inline checks. Features: bankSync, receiptScan, autoMileage, quarterlyTax, scheduleC, cpaPacket, prioritySupport (`lib/billing/features.ts`).
- `Photo` with entries from `@/constants/images` (`photos.home` etc.): `<Photo source={photos.home.source} focus={photos.home.focus} accessibilityLabel={photos.home.alt} aspectRatio={…} />`. Sources are null for now and render as a green panel — that is expected.

Tokens: `useAppTheme().theme` (background, surface, surfaceMuted, border, borderStrong, text, textMuted, textFaint, primary, onPrimary, primarySoft, accent, accentSoft, positive, negative, warning). Spacing/radius/type from `@/constants/theme` (`space.lg` = 16 etc.). Never use the old `colors` palette, hex literals, or `components/ui|ledger|onboarding|shell|launch` in rebuilt screens.

## Rules

- Calm and specific. Sentence case. No emoji, no exclamation marks, no "seamless/unlock/supercharge". Say what a thing does: "Set aside $4,600 for Q4" not "Crush your taxes".
- One primary button per screen. Everything else secondary or ghost.
- Numbers: `Amount` for money; percentages and counts in `Text` with `style={tabularNums}`.
- No hard-coded bottom padding for the tab bar; `Screen` and native tabs handle it.
- Long text: `numberOfLines` on any single-line label; rows already truncate.
- Lists longer than ~20 items: `FlatList` with a memoised row and `keyExtractor`; never `.map` inside a ScrollView.
- No timers, auto-advancing carousels, decorative absolute-positioned shapes, shadows or gradients.
- Touch targets ≥ 44pt. Every icon-only control has an `accessibilityLabel`.
- iOS and Android both: use `Platform` only where behaviour truly differs (e.g. date pickers, action sheets via `Alert`).
- Data and actions come from `useLedger()` (`providers/ledger-provider.tsx`). Do not change the provider's API. Keep every existing capability of a screen unless the brief says to drop it.
- Navigation uses typed routes (`router.push('/upgrade')`). Tab routes: `/dashboard`, `/activity`, `/mileage`, `/tax`, `/more`.
- The app runs in mock mode with seeded data; `usingLiveBackend` is false. Integrations (Plaid, Stripe, RevenueCat, Supabase) must keep working when configured, and must fail politely (an `Alert`) when not.

## Done means

- `npx tsc --noEmit` passes for your files.
- The screen reads well at 320pt wide and on a tablet (content is centred by `Screen`).
- Light and dark both look intentional.

## Restraint (added 2026-10-22 after owner review)

The owner's bar is "as simple as the best apps". Every screen is held to this:

- One job per screen, stated in a one-line comment above the component.
- At most one hero number. At most ~4 blocks before the first scroll on a 6.1" phone.
- Don't fill space. Empty space is part of the design; tiles are for navigation, not decoration.
- Details are one tap away (a row with a chevron), never all on screen at once.
- No information appears on two screens unless it's the reason the user came.
- The first screen after the splash never scrolls.
