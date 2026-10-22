# LedgerPilot

LedgerPilot is a premium React Native app for freelancers, creators, consultants, agents, and gig workers who need one mobile place to track deductions, mileage, quarterly taxes, and a CPA-ready year-end packet.

This repo is built with Expo Router, TypeScript, and a production-minded component and state architecture. The current implementation gives you a polished mobile MVP with seeded demo data, realistic product flows, and clear extension points for bank links, OCR, subscriptions, notifications, and exports.

## What is already built

- Onboarding flow for solo professionals
- Premium dashboard with deduction, reserve, and deadline visibility
- Transaction feed with deduction toggles and category cycling
- Receipt vault with manual add flow and OCR-style verification states
- Mileage tracker with business, mixed, and personal classification
- Quarterly tax cockpit with reserve controls and deadline cards
- Plan and monetization modal for Lite, Pro, and Tax+
- CPA packet preview for year-end handoff

## Tech stack

- Expo SDK 54
- React Native 0.81
- Expo Router
- TypeScript

## How to run this if you are new to app development

### 1. Install the basics

- Install Node.js LTS from [nodejs.org](https://nodejs.org/)
- Install the Expo Go app on your phone:
  - iPhone: App Store search for `Expo Go`
  - Android: Google Play search for `Expo Go`

### 2. Install project dependencies

Open a terminal in this folder and run:

```bash
npm install
```

### 3. Start the app

```bash
npm run start
```

Expo will show a QR code in the terminal.

### 4. Open it on your phone

- iPhone: open the Camera app and scan the QR code, then tap the Expo link
- Android: open Expo Go and scan the QR code inside the app

### 5. Optional local emulator notes

- Android emulator works on Windows if you install Android Studio
- iOS Simulator does not run locally on Windows
- If you want an iPhone app build from Windows, use EAS Build later

## Useful commands

```bash
npm run start
npm run android
npm run web
npm run lint
npm run typecheck
```

## Important reality check for a 4 million user launch

This codebase gives you a strong mobile MVP and product shell, but no honest engineer should claim a brand new finance and tax app is instantly ready for 4 million real users without the backend, security, compliance, and legal layers.

What this repo is ready for now:

- Product demos
- beta testing
- design validation
- founder pitching
- user interviews
- engineering handoff

What still needs to be added before a true production-scale launch:

- Auth and user accounts
- Plaid or similar financial aggregation
- OCR pipeline for receipt ingestion
- Cloud storage for receipt images and exports
- Push notification service
- Subscription billing
- Backend APIs and database
- Audit logging
- Tax-logic review by a CPA or EA
- Security hardening and privacy/compliance review

See [docs/production-roadmap.md](/C:/Users/HOME%20PC/Documents/newapp/docs/production-roadmap.md) for the scale plan.
