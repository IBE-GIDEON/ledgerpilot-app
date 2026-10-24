import {
  AddReceiptPayload,
  AddTransactionPayload,
  AddTripPayload,
  OnboardingPayload,
  UpdateProfilePayload,
  UpdateTransactionPayload,
} from '@/lib/backend/payloads';
import {
  BillingSnapshot,
  MileageTrip,
  QuarterEstimate,
  Receipt,
  Transaction,
  UserProfile,
} from '@/types/ledger';
import { Database } from '@/types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type ReceiptInsert = Database['public']['Tables']['receipts']['Insert'];
type ReceiptRow = Database['public']['Tables']['receipts']['Row'];
type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type TransactionRow = Database['public']['Tables']['transactions']['Row'];
type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];
type TripInsert = Database['public']['Tables']['mileage_trips']['Insert'];
type TripRow = Database['public']['Tables']['mileage_trips']['Row'];
type QuarterRow = Database['public']['Tables']['quarter_snapshots']['Row'];

export function mapProfileRowToUserProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    name: row.full_name,
    role: row.role,
    avatarUrl: row.avatar_url,
    homeState: row.home_state,
    currency: row.currency ?? 'USD',
    incomeStyle: row.income_style as UserProfile['incomeStyle'],
    primaryFocus: row.primary_focus as UserProfile['primaryFocus'],
    mileageMode: row.mileage_mode as UserProfile['mileageMode'],
  };
}

export function mapProfileRowToBillingSnapshot(row: ProfileRow): BillingSnapshot {
  return {
    billingSetupComplete: row.billing_setup_complete ?? false,
    paymentMethodStatus: row.payment_method_status as BillingSnapshot['paymentMethodStatus'],
    stripeDefaultPaymentMethodId: row.stripe_default_payment_method_id ?? null,
    subscriptionProductId: row.subscription_product_id ?? null,
    subscriptionStatus: row.subscription_status as BillingSnapshot['subscriptionStatus'],
    subscriptionStore: (row.subscription_store as BillingSnapshot['subscriptionStore']) ?? null,
    trialStartedAt: row.trial_started_at ?? null,
    trialEndsAt: row.trial_ends_at ?? null,
  };
}

export function buildProfileUpdate(payload: OnboardingPayload): ProfileUpdate {
  return {
    role: payload.role,
    currency: payload.currency,
    income_style: payload.incomeStyle,
    primary_focus: payload.primaryFocus,
    mileage_mode: payload.mileageMode,
    onboarding_complete: true,
  };
}

export function buildEditableProfileUpdate(payload: UpdateProfilePayload): ProfileUpdate {
  return {
    full_name: payload.name,
    role: payload.role,
    home_state: payload.homeState,
    currency: payload.currency,
  };
}

export function mapTransactionRowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    merchant: row.merchant,
    amount: row.amount,
    kind: row.kind as Transaction['kind'],
    category: row.category,
    deductible: row.deductible,
    receiptId: row.receipt_id,
    source: row.source,
    date: row.occurred_at,
    note: row.note,
  };
}

export function buildTransactionInsert(
  userId: string,
  payload: AddTransactionPayload
): TransactionInsert {
  const syncStatus =
    payload.source === 'Receipt scan' || payload.source === 'Manual receipt'
      ? 'receipt_scan'
      : 'manual';

  return {
    user_id: userId,
    merchant: payload.merchant,
    amount: payload.kind === 'income' ? Math.abs(payload.amount) : -Math.abs(payload.amount),
    kind: payload.kind,
    category: payload.category,
    deductible: payload.kind === 'expense' ? payload.deductible : false,
    source: payload.source,
    sync_status: syncStatus,
    note: payload.note,
    occurred_at: new Date().toISOString(),
  };
}

export function buildTransactionUpdate(payload: UpdateTransactionPayload): TransactionUpdate {
  return {
    merchant: payload.merchant,
    amount: payload.kind === 'income' ? Math.abs(payload.amount) : -Math.abs(payload.amount),
    kind: payload.kind,
    category: payload.category,
    deductible: payload.kind === 'expense' ? payload.deductible : false,
    note: payload.note,
  };
}

export function mapReceiptRowToReceipt(row: ReceiptRow): Receipt {
  return {
    id: row.id,
    vendor: row.vendor,
    amount: row.amount,
    category: row.category,
    confidence: row.ocr_confidence ?? null,
    status: row.status as Receipt['status'],
    date: row.captured_at,
    note: row.note,
    storagePath: row.storage_path,
  };
}

export function buildReceiptInsert(userId: string, payload: AddReceiptPayload): ReceiptInsert {
  return {
    user_id: userId,
    vendor: payload.vendor,
    amount: payload.amount,
    category: payload.category,
    status: payload.status ?? 'Needs review',
    ocr_confidence: payload.confidence ?? null,
    storage_path: payload.storagePath ?? null,
    note: payload.note ?? 'Captured inside Lancer',
    captured_at: new Date().toISOString(),
  };
}

export function mapTripRowToMileageTrip(row: TripRow): MileageTrip {
  return {
    id: row.id,
    startLabel: row.start_label,
    endLabel: row.end_label,
    miles: row.miles,
    purpose: row.purpose,
    date: row.occurred_at,
    classification: row.classification as MileageTrip['classification'],
  };
}

export function buildTripInsert(userId: string, payload: AddTripPayload): TripInsert {
  return {
    user_id: userId,
    start_label: payload.startLabel,
    end_label: payload.endLabel,
    miles: payload.miles,
    purpose: payload.purpose,
    classification: payload.classification ?? 'Business',
    occurred_at: new Date().toISOString(),
  };
}

export function mapQuarterRowToQuarterEstimate(row: QuarterRow): QuarterEstimate {
  return {
    id: row.id,
    label: row.label,
    dueDate: row.due_date,
    amountDue: row.amount_due,
    status: row.status as QuarterEstimate['status'],
  };
}
