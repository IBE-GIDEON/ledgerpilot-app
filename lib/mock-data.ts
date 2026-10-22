import {
  BillingSnapshot,
  DeductionInsight,
  MileageTrip,
  Receipt,
  Transaction,
  UserProfile,
} from '@/types/ledger';

const trialStartedAt = new Date().toISOString();
const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

export const expenseCategories = [
  'Software',
  'Travel',
  'Meals',
  'Education',
  'Marketing',
  'Office',
  'Equipment',
  'Banking',
  'Contractors',
  'Car',
  'Rent',
  'Misc',
] as const;

export const incomeCategories = ['Income', 'Client payment', 'Freelance', 'Salary'] as const;

export const defaultProfile: UserProfile = {
  id: 'user-1',
  name: 'Maya',
  role: 'Creator',
  homeState: 'California',
  incomeStyle: 'Mixed payouts',
  primaryFocus: 'Everything in one place',
  mileageMode: 'Sometimes',
};

export const defaultBilling: BillingSnapshot = {
  billingSetupComplete: false,
  paymentMethodStatus: 'missing',
  stripeDefaultPaymentMethodId: null,
  subscriptionProductId: null,
  subscriptionStatus: 'trialing',
  subscriptionStore: null,
  trialStartedAt,
  trialEndsAt,
};

export const seededTransactions: Transaction[] = [
  {
    id: 'tx-1',
    merchant: 'Upwork Client Retainer',
    amount: 3400,
    kind: 'income',
    category: 'Income',
    deductible: false,
    source: 'Chase Business',
    date: '2026-04-12',
    note: 'Monthly retainer invoice',
  },
  {
    id: 'tx-2',
    merchant: 'Stripe Payout',
    amount: 2825,
    kind: 'income',
    category: 'Income',
    deductible: false,
    source: 'Stripe',
    date: '2026-04-09',
    note: 'Course sales payout',
  },
  {
    id: 'tx-3',
    merchant: 'Adobe Creative Cloud',
    amount: -59.99,
    kind: 'expense',
    category: 'Software',
    deductible: true,
    source: 'American Express',
    date: '2026-04-08',
    note: 'Design and video workflows',
  },
  {
    id: 'tx-4',
    merchant: 'Riverside',
    amount: -24,
    kind: 'expense',
    category: 'Software',
    deductible: true,
    source: 'American Express',
    date: '2026-04-06',
    note: 'Podcast production',
  },
  {
    id: 'tx-5',
    merchant: 'Uber to client shoot',
    amount: -48.5,
    kind: 'expense',
    category: 'Travel',
    deductible: true,
    source: 'Chase Business',
    date: '2026-04-03',
    note: 'Downtown brand shoot',
  },
  {
    id: 'tx-6',
    merchant: 'Blue Bottle',
    amount: -13.2,
    kind: 'expense',
    category: 'Meals',
    deductible: false,
    source: 'Chase Personal',
    date: '2026-04-02',
    note: 'Coffee before co-working',
  },
  {
    id: 'tx-7',
    merchant: 'Notion',
    amount: -18,
    kind: 'expense',
    category: 'Software',
    deductible: true,
    source: 'American Express',
    date: '2026-04-01',
    note: 'Client workspace and content calendar',
  },
  {
    id: 'tx-8',
    merchant: 'Meta Ads',
    amount: -265,
    kind: 'expense',
    category: 'Marketing',
    deductible: true,
    source: 'American Express',
    date: '2026-03-28',
    note: 'Lead magnet campaign',
  },
];

export const seededReceipts: Receipt[] = [
  {
    id: 'receipt-1',
    vendor: 'Canva Pro',
    amount: 13.99,
    category: 'Software',
    confidence: 0.98,
    status: 'Verified',
    date: '2026-04-10',
    note: 'Brand templates and social exports',
  },
  {
    id: 'receipt-2',
    vendor: 'WeWork Day Pass',
    amount: 65,
    category: 'Office',
    confidence: 0.91,
    status: 'Needs review',
    date: '2026-04-05',
    note: 'Editing and client calls',
  },
  {
    id: 'receipt-3',
    vendor: 'Best Buy',
    amount: 68.42,
    category: 'Equipment',
    confidence: 0.96,
    status: 'Verified',
    date: '2026-03-29',
    note: 'Spare SSD for client footage',
  },
];

export const seededTrips: MileageTrip[] = [
  {
    id: 'trip-1',
    startLabel: 'Brooklyn studio',
    endLabel: 'SoHo client office',
    miles: 18.4,
    purpose: 'Brand strategy workshop',
    date: '2026-04-11',
    classification: 'Business',
  },
  {
    id: 'trip-2',
    startLabel: 'Home',
    endLabel: 'Coworking hub',
    miles: 11.2,
    purpose: 'Editing and podcast recording',
    date: '2026-04-07',
    classification: 'Business',
  },
  {
    id: 'trip-3',
    startLabel: 'Home',
    endLabel: 'Gym',
    miles: 7.1,
    purpose: 'Personal errand',
    date: '2026-04-04',
    classification: 'Personal',
  },
];

export const seededInsights: DeductionInsight[] = [
  {
    id: 'insight-1',
    title: 'Software stack is quietly compounding',
    summary:
      'Adobe, Notion, Canva, and Riverside together create a steady deduction stream. Keep every renewal categorized to protect year-end write-offs.',
    estimatedSavings: 412,
  },
  {
    id: 'insight-2',
    title: 'Mileage logging is worth real money in 2026',
    summary:
      'At 72.5 cents per business mile, the trips you already logged would cover more than a month of Lite pricing.',
    estimatedSavings: 96,
  },
  {
    id: 'insight-3',
    title: 'Your next quarterly payment is coming fast',
    summary:
      'Reserve a slice of incoming payouts automatically so your June estimated tax due date feels routine instead of painful.',
    estimatedSavings: 530,
  },
];
