export type PlanTier = 'Lite' | 'Pro' | 'Tax+';
export type PaymentMethodStatus = 'missing' | 'pending' | 'ready';
export type SubscriptionStatus = 'trialing' | 'active' | 'expired';
export type SubscriptionStore =
  | 'APP_STORE'
  | 'PLAY_STORE'
  | 'RC_BILLING'
  | 'STRIPE'
  | 'UNKNOWN';

export type TransactionKind = 'income' | 'expense';

export type ReceiptStatus = 'Verified' | 'Needs review';

export type TripClassification = 'Business' | 'Mixed' | 'Personal';

export type IncomeStyle = 'Steady monthly' | 'Mixed payouts' | 'Variable weekly' | 'Gig by gig';

export type SetupFocus =
  | 'Expenses & receipts'
  | 'Mileage tracking'
  | 'Quarterly tax'
  | 'Everything in one place';

export type MileageMode = 'Often' | 'Sometimes' | 'Rarely' | 'Never';

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  homeState: string;
  /** ISO 4217 code every amount is shown in, e.g. "USD", "NGN", "GBP". */
  currency: string;
  incomeStyle: IncomeStyle;
  primaryFocus: SetupFocus;
  mileageMode: MileageMode;
}

export interface BillingSnapshot {
  billingSetupComplete: boolean;
  paymentMethodStatus: PaymentMethodStatus;
  stripeDefaultPaymentMethodId?: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionProductId?: string | null;
  subscriptionStore?: SubscriptionStore | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
}

export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  kind: TransactionKind;
  category: string;
  deductible: boolean;
  receiptId?: string | null;
  source: string;
  date: string;
  note: string;
}

export interface Receipt {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  confidence: number | null;
  status: ReceiptStatus;
  date: string;
  note: string;
  storagePath?: string | null;
}

export interface MileageTrip {
  id: string;
  startLabel: string;
  endLabel: string;
  miles: number;
  purpose: string;
  date: string;
  classification: TripClassification;
}

export interface DeductionInsight {
  id: string;
  title: string;
  summary: string;
  estimatedSavings: number;
}

export interface QuarterEstimate {
  id: string;
  label: string;
  dueDate: string;
  amountDue: number;
  status: 'Complete' | 'Next up' | 'Upcoming';
}
