# LedgerPilot Production Roadmap

## What the mobile app already solves

The current React Native app already establishes the user experience, information architecture, pricing logic, and core feature flows:

- dashboard for money clarity
- transaction review
- receipt capture and verification
- mileage logging
- tax reserve guidance
- quarterly estimates
- CPA packet preview

This means the mobile surface area is no longer the blocker. The next work is operational trust.

## What a real 4 million user architecture should look like

### Mobile client

- Expo React Native app for iOS and Android
- feature flags for staged rollout
- analytics events for onboarding, conversion, retention, and tax-season attach rates
- secure token storage and device registration

### Core backend services

- API gateway for mobile requests
- auth service for sign-in, session rotation, and device trust
- ledger service for normalized transactions, receipts, categories, and mileage logs
- tax estimate service for quarterly guidance and reserve calculations
- export service for CPA packets, CSV, PDF, and signed download URLs
- notification service for deadlines, missing receipts, and reserve nudges

### Data layer

- Postgres for primary relational data
- Redis for queue coordination, caching, and rate limiting
- object storage for receipt images and export files
- warehouse or event stream for analytics and attribution

### Third-party integrations

- Plaid or equivalent for read-only bank and card linking
- OCR provider for receipt text extraction
- RevenueCat or native store subscriptions for billing
- Expo Notifications or native push pipeline for reminders
- transactional email provider for export and compliance notices

### Reliability model

- background jobs for sync, OCR, export generation, and reminder scheduling
- idempotent webhook handlers
- audit logging for every financial sync and classification change
- per-tenant rate limits and abuse controls
- SLOs around sync freshness, export generation, and notification delivery

## Security and trust requirements

For finance products, trust is the product.

You should plan for:

- least-privilege access to financial data
- read-only account linking
- encryption in transit and at rest
- secret rotation
- event audit trails
- privacy policy and data retention controls
- tax logic reviewed by a licensed CPA or EA
- careful wording so the app does not imply unlicensed tax advice

## Recommended rollout plan

### Phase 1: Founder beta

- 50 to 200 users
- manual support
- mocked or limited integrations
- aggressive instrumentation

### Phase 2: Paid pilot

- 1,000 to 10,000 users
- real bank linking
- real receipt OCR
- subscription billing
- retention and conversion tuning

### Phase 3: Tax-season launch

- 50,000 to 250,000 users
- queue-backed exports
- customer support tooling
- partner accountant workflow
- alerting and incident response

### Phase 4: National scale

- multi-region backend
- cost controls on OCR and sync jobs
- feature flags by segment
- data warehouse and LTV or CAC reporting
- compliance program

## Recommended KPI dashboard

- bank-link success rate
- receipt OCR confidence and correction rate
- weekly active users
- mileage captured per active user
- reserve recommendation acceptance rate
- day-35 paid conversion
- annual plan mix
- filing add-on attach rate
- expert review attach rate
- 90-day retention
- churn after the first tax deadline

## Immediate next engineering steps

1. Add authentication and persisted user state.
2. Replace seeded demo data with a real API and database.
3. Integrate read-only financial aggregation.
4. Add receipt image upload and OCR workers.
5. Implement subscriptions and entitlement gating.
6. Add notifications, analytics, and crash monitoring.
7. Run security, legal, and tax-review passes before public launch.
