import { featureFlags } from '@/lib/config/env';
import type { PlanTier } from '@/types/ledger';

/** Paid capabilities and the lowest plan that includes each one. */
export const featurePlan = {
  bankSync: 'Pro',
  receiptScan: 'Pro',
  autoMileage: 'Pro',
  quarterlyTax: 'Pro',
  scheduleC: 'Pro',
  cpaPacket: 'Tax+',
  prioritySupport: 'Tax+',
} as const satisfies Record<string, PlanTier>;

export type Feature = keyof typeof featurePlan;

export const featureCopy: Record<Feature, { title: string; body: string }> = {
  bankSync: {
    title: 'Bank sync',
    body: 'Import transactions from your bank and cards automatically.',
  },
  receiptScan: {
    title: 'Receipt scanning',
    body: 'Snap a receipt and Lancer reads the vendor, date and amount.',
  },
  autoMileage: {
    title: 'Automatic mileage',
    body: 'Detect work drives in the background and log them for review.',
  },
  quarterlyTax: {
    title: 'Quarterly tax estimates',
    body: 'Know what to pay each quarter and get reminded before it is due.',
  },
  scheduleC: {
    title: 'Schedule C summary',
    body: 'Income and deductions grouped the way the IRS asks for them.',
  },
  cpaPacket: {
    title: 'Year-end CPA packet',
    body: 'One export with everything your accountant needs.',
  },
  prioritySupport: {
    title: 'Priority support',
    body: 'Faster answers from a real person.',
  },
};

const rank: Record<PlanTier, number> = { Lite: 0, Pro: 1, 'Tax+': 2 };

export function planIncludes(plan: PlanTier, feature: Feature) {
  return rank[plan] >= rank[featurePlan[feature]];
}

export const plans: {
  tier: PlanTier;
  monthly: string;
  annual: string;
  summary: string;
  features: string[];
}[] = [
  {
    tier: 'Lite',
    monthly: '$3',
    annual: '$29',
    summary: 'A clean home for income, expenses, receipts and miles.',
    features: ['Manual tracking', 'Profit summary', 'Deduction tags'],
  },
  {
    tier: 'Pro',
    monthly: '$6',
    annual: '$59',
    summary: 'Everything automatic, with tax handled every quarter.',
    features: [...(featureFlags.bankSync ? ['Bank sync'] : []), 'Receipt scanning', 'Quarterly tax', 'Auto mileage'],
  },
  {
    tier: 'Tax+',
    monthly: '$12',
    annual: '$119',
    summary: 'Filing season without the scramble.',
    features: ['Everything in Pro', 'CPA packet', 'Priority support'],
  },
];
