import {
  IncomeStyle,
  MileageMode,
  SetupFocus,
  TransactionKind,
  TripClassification,
} from '@/types/ledger';

export type AddReceiptPayload = {
  vendor: string;
  amount: number;
  category: string;
  confidence?: number | null;
  note?: string;
  status?: 'Verified' | 'Needs review';
  storagePath?: string | null;
  transactionId?: string;
};

export type AddTripPayload = {
  startLabel: string;
  endLabel: string;
  miles: number;
  purpose: string;
  classification?: TripClassification;
};

export type AddTransactionPayload = {
  amount: number;
  category: string;
  deductible: boolean;
  kind: TransactionKind;
  merchant: string;
  note: string;
  receipt?: Omit<AddReceiptPayload, 'transactionId'>;
  source: string;
  /** When the money moved (ISO). Defaults to now; bank alerts pass the alert's time. */
  occurredAt?: string;
};

export type UpdateTransactionPayload = {
  amount: number;
  category: string;
  deductible: boolean;
  id: string;
  kind: TransactionKind;
  merchant: string;
  note: string;
};

export type OnboardingPayload = {
  currency: string;
  incomeStyle: IncomeStyle;
  mileageMode: MileageMode;
  primaryFocus: SetupFocus;
  role: string;
};

export type UpdateProfilePayload = {
  currency: string;
  homeState: string;
  name: string;
  role: string;
};
