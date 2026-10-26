import { featureFlags } from '@/lib/config/env';
import type { PlanTier } from '@/types/ledger';

/** Things Lancer charges for. One plan includes all of them. */
export type Feature = 'bankSync' | 'receiptScan' | 'prioritySupport';

export const featureCopy: Record<Feature, { title: string; body: string }> = {
  bankSync: {
    title: 'Bank sync',
    body: 'Import transactions from your banks automatically.',
  },
  receiptScan: {
    title: 'Receipt scanning',
    body: 'Snap a receipt and Lancer reads the vendor, date and amount.',
  },
  prioritySupport: {
    title: 'Support',
    body: 'Answers from a real person.',
  },
};

/** The single plan is stored as 'Pro' so existing profiles and store products keep working. */
export const LANCER_PLAN: PlanTier = 'Pro';

export function planIncludes(_plan: PlanTier, _feature: Feature) {
  return true;
}

export const plans: {
  tier: PlanTier;
  name: string;
  monthly: string;
  summary: string;
  features: string[];
}[] = [
  {
    tier: LANCER_PLAN,
    name: 'Lancer',
    monthly: '$3',
    summary: 'Every bank, every naira, dollar or cedi in and out, in one place.',
    features: [
      'Unlimited transactions',
      'Money in and out by bank',
      'Categories and receipts',
      ...(featureFlags.bankSync ? ['Bank sync'] : []),
      'PDF and spreadsheet export',
    ],
  },
];
