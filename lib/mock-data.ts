import {
  BillingSnapshot,
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
  'Taxes',
] as const;

export const incomeCategories = ['Income', 'Client payment', 'Freelance', 'Salary'] as const;

/** A real account before onboarding fills it in: no made-up name, role or state. */
export const defaultProfile: UserProfile = {
  id: '',
  name: '',
  role: '',
  homeState: '',
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
