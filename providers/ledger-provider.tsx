import { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AppState, AppStateStatus } from 'react-native';

import { clearRevenueCatCustomer } from '@/lib/billing/revenuecat';
import {
  AddReceiptPayload,
  AddTransactionPayload,
  AddTripPayload,
  OnboardingPayload,
  UpdateProfilePayload,
  UpdateTransactionPayload,
} from '@/lib/backend/payloads';
import {
  buildEditableProfileUpdate,
  buildProfileUpdate,
  buildReceiptInsert,
  buildTransactionInsert,
  buildTransactionUpdate,
  buildTripInsert,
  mapProfileRowToBillingSnapshot,
  mapProfileRowToUserProfile,
  mapReceiptRowToReceipt,
  mapTransactionRowToTransaction,
  mapTripRowToMileageTrip,
} from '@/lib/backend/mappers';
import { forgetAccount, rememberAccount } from '@/lib/auth/recent-accounts';
import { setDisplayCurrency } from '@/lib/formatters';
import { env, usingSupabaseBackend } from '@/lib/config/env';
import {
  defaultBilling,
  defaultProfile,
  expenseCategories,
} from '@/lib/mock-data';
import {
  createSessionFromUrl,
  getAuthRedirectUrl,
} from '@/lib/supabase/auth';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import { syncLocalReminders } from '@/lib/notifications/native';
import {
  getQuarterEstimates,
  getReserveGap,
  getYearSummary,
} from '@/lib/tax';
import {
  BillingSnapshot,
  DeductionInsight,
  IncomeStyle,
  MileageTrip,
  PaymentMethodStatus,
  PlanTier,
  Receipt,
  SubscriptionStatus,
  Transaction,
  TransactionKind,
  TripClassification,
  UserProfile,
} from '@/types/ledger';

interface LedgerState {
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  profile: UserProfile;
  billing: BillingSnapshot;
  activePlan: PlanTier;
  reservePercent: number;
  transactions: Transaction[];
  receipts: Receipt[];
  trips: MileageTrip[];
  deductionInsights: DeductionInsight[];
}

type HydrateSessionPayload = {
  activePlan: PlanTier;
  billing: BillingSnapshot;
  onboardingComplete: boolean;
  profile: UserProfile;
  receipts: Receipt[];
  reservePercent: number;
  transactions: Transaction[];
  trips: MileageTrip[];
};

type LedgerAction =
  | { type: 'startSession'; name: string }
  | { type: 'hydrateSession'; payload: HydrateSessionPayload }
  | { type: 'endSession' }
  | { type: 'completeOnboarding'; payload: OnboardingPayload }
  | {
      type: 'completeBillingSetup';
      payload: {
        paymentMethodStatus: PaymentMethodStatus;
        plan: PlanTier;
      };
    }
  | { type: 'addTransaction'; payload: AddTransactionPayload }
  | { type: 'updateTransaction'; payload: UpdateTransactionPayload }
  | { type: 'deleteTransaction'; id: string }
  | { type: 'toggleTransactionDeductible'; id: string }
  | { type: 'cycleTransactionCategory'; id: string }
  | { type: 'addReceipt'; payload: AddReceiptPayload }
  | { type: 'deleteReceipt'; id: string }
  | { type: 'toggleReceiptVerified'; id: string }
  | { type: 'addTrip'; payload: AddTripPayload }
  | { type: 'deleteTrip'; id: string }
  | { type: 'cycleTripClassification'; id: string }
  | { type: 'setReservePercent'; value: number }
  | { type: 'setActivePlan'; plan: PlanTier }
  | { type: 'updateAvatar'; url: string }
  | { type: 'updateProfile'; payload: UpdateProfilePayload };

type SignUpResult = 'authenticated' | 'confirm-email';

interface LedgerContextValue extends LedgerState {
  accounts: string[];
  authBusy: boolean;
  backendMode: typeof env.backendMode;
  isHydratingAuth: boolean;
  quarters: ReturnType<typeof getQuarterEstimates>;
  usingLiveBackend: boolean;
  access: {
    billingSetupComplete: boolean;
    isBlocked: boolean;
    isTrialExpired: boolean;
    paymentMethodStatus: PaymentMethodStatus;
    subscriptionStatus: SubscriptionStatus;
    trialDaysRemaining: number;
    trialEndsAt: string | null;
  };
  /** All figures are for `year`, the current calendar year. */
  metrics: {
    year: number;
    income: number;
    expenses: number;
    netProfit: number;
    deductibleTotal: number;
    mileageWriteOff: number;
    reserveTarget: number;
    reserveGap: number;
    /** Payments recorded in the Taxes category. */
    taxPaid: number;
    /** The year's set-aside minus tax already paid. */
    stillToSetAside: number;
    afterTaxIncome: number;
    uncategorizedReceiptValue: number;
  };
  auth: {
    deleteAccount: () => Promise<void>;
    /** With an email, Google goes straight to that account; without, it shows the account picker. */
    signInWithGoogle: (loginHint?: string) => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    signUpWithEmail: (params: {
      email: string;
      name: string;
      password: string;
    }) => Promise<SignUpResult>;
    sendPasswordResetEmail: (email: string) => Promise<void>;
  };
  actions: {
    addTransaction: (payload: AddTransactionPayload) => Promise<void>;
    addReceipt: (payload: AddReceiptPayload) => Promise<void>;
    addTrip: (payload: AddTripPayload) => Promise<void>;
    completeBillingSetup: (params: {
      plan: PlanTier;
      paymentMethodStatus?: PaymentMethodStatus;
      withCard: boolean;
    }) => Promise<void>;
    completeOnboarding: (payload: OnboardingPayload) => Promise<void>;
    cycleTransactionCategory: (id: string) => Promise<void>;
    cycleTripClassification: (id: string) => Promise<void>;
    deleteReceipt: (id: string) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    deleteTrip: (id: string) => Promise<void>;
    refreshData: () => Promise<void>;
    setActivePlan: (plan: PlanTier) => Promise<void>;
    setReservePercent: (value: number) => Promise<void>;
    startSession: (name: string) => void;
    toggleReceiptVerified: (id: string) => Promise<void>;
    toggleTransactionDeductible: (id: string) => Promise<void>;
    updateTransaction: (payload: UpdateTransactionPayload) => Promise<void>;
    updateAvatar: (uri: string) => Promise<void>;
    updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  };
}

const initialState: LedgerState = {
  isAuthenticated: false,
  onboardingComplete: false,
  profile: defaultProfile,
  billing: defaultBilling,
  activePlan: 'Pro',
  reservePercent: 28,
  // Accounts start empty; everything shown comes from what the user adds.
  transactions: [],
  receipts: [],
  trips: [],
  deductionInsights: [],
};

const classificationCycle: TripClassification[] = ['Business', 'Mixed', 'Personal'];
const missingProfilesColumnPattern = /Could not find the '([^']+)' column of 'profiles' in the schema cache/i;
let hasWarnedMissingBillingColumns = false;

const LedgerContext = createContext<LedgerContextValue | undefined>(undefined);

function nextCategory(currentCategory: string): string {
  const currentIndex = expenseCategories.indexOf(
    currentCategory as (typeof expenseCategories)[number]
  );
  const fallbackIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % expenseCategories.length;
  return expenseCategories[fallbackIndex];
}

function nextClassification(current: TripClassification): TripClassification {
  const currentIndex = classificationCycle.indexOf(current);
  const fallbackIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % classificationCycle.length;
  return classificationCycle[fallbackIndex];
}

function getReservePercentForIncomeStyle(incomeStyle: IncomeStyle): number {
  switch (incomeStyle) {
    case 'Steady monthly':
      return 22;
    case 'Mixed payouts':
      return 28;
    case 'Variable weekly':
      return 32;
    case 'Gig by gig':
      return 35;
    default:
      return 28;
  }
}

function normalizeTransactionAmount(kind: TransactionKind, amount: number): number {
  const absoluteAmount = Math.abs(amount);
  return kind === 'income' ? absoluteAmount : -absoluteAmount;
}

function isReceiptGeneratedSource(source: string) {
  return source === 'Receipt scan' || source === 'Manual receipt';
}

function toPlanTier(value: string | undefined): PlanTier {
  return value === 'Lite' || value === 'Tax+' ? value : 'Pro';
}

function toPaymentMethodStatus(value: string | undefined): PaymentMethodStatus {
  return value === 'pending' || value === 'ready' ? value : 'missing';
}

function toSubscriptionStatus(value: string | undefined): SubscriptionStatus {
  return value === 'active' || value === 'expired' ? value : 'trialing';
}

function fallbackProfileFromUser(user: User): UserProfile {
  const rawName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : user.email?.split('@')[0];

  let avatarUrl =
    typeof user.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata?.picture === 'string'
      ? user.user_metadata.picture
      : null;

  // Polish Google URLs for high-res and https
  if (avatarUrl && avatarUrl.includes('googleusercontent.com')) {
    avatarUrl = avatarUrl.replace(/=s\d+-c/g, '=s400-c'); // Force 400x400
    if (avatarUrl.startsWith('http:')) {
      avatarUrl = avatarUrl.replace('http:', 'https:');
    }
  }

  return {
    ...defaultProfile,
    id: user.id,
    name: rawName?.trim() || defaultProfile.name,
    avatarUrl,
  };
}

function fallbackBillingFromUser(): BillingSnapshot {
  return {
    ...defaultBilling,
  };
}

function getTrialDaysRemaining(trialEndsAt: string | null) {
  if (!trialEndsAt) {
    return 0;
  }

  const endsAt = new Date(trialEndsAt).getTime();
  const diff = endsAt - Date.now();

  if (diff <= 0) {
    return 0;
  }

  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function isMissingProfilesColumnError(message: string) {
  return missingProfilesColumnPattern.test(message);
}

function warnMissingBillingColumnsOnce(message: string) {
  if (hasWarnedMissingBillingColumns) {
    return;
  }

  hasWarnedMissingBillingColumns = true;
  console.warn(
    'Billing columns are not live in Supabase yet. Run 20260422_0004_launch_access.sql, then refresh the app.',
    message
  );
}

type SupabaseClientInstance = NonNullable<ReturnType<typeof getSupabaseClient>>;
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/**
 * Writes a profile update. If the database doesn't have the currency column yet (migration 0010),
 * saves everything else instead of failing the whole write.
 */
async function writeProfile(supabase: SupabaseClientInstance, userId: string, values: ProfileUpdate) {
  const { error } = await supabase.from('profiles').update(values).eq('id', userId);

  if (error && 'currency' in values && /currency/i.test(error.message)) {
    const { currency: _unsupported, ...rest } = values;
    const retry = await supabase.from('profiles').update(rest).eq('id', userId);
    if (retry.error) {
      throw new Error(retry.error.message);
    }
    return;
  }

  if (error) {
    throw new Error(error.message);
  }
}

function ledgerReducer(state: LedgerState, action: LedgerAction): LedgerState {
  switch (action.type) {
    case 'startSession':
      return {
        ...state,
        isAuthenticated: true,
        onboardingComplete: false,
        profile: {
          ...state.profile,
          name: action.name,
        },
      };
    case 'hydrateSession':
      return {
        ...state,
        isAuthenticated: true,
        onboardingComplete: action.payload.onboardingComplete,
        profile: action.payload.profile,
        billing: action.payload.billing,
        activePlan: action.payload.activePlan,
        reservePercent: action.payload.reservePercent,
        transactions: action.payload.transactions,
        receipts: action.payload.receipts,
        trips: action.payload.trips,
      };
    case 'endSession':
      return {
        ...initialState,
      };
    case 'completeOnboarding':
      return {
        ...state,
        isAuthenticated: true,
        onboardingComplete: true,
        reservePercent: getReservePercentForIncomeStyle(action.payload.incomeStyle),
        profile: {
          ...state.profile,
          ...action.payload,
        },
      };
    case 'completeBillingSetup':
      return {
        ...state,
        activePlan: action.payload.plan,
        billing: {
          ...state.billing,
          billingSetupComplete: true,
          paymentMethodStatus: action.payload.paymentMethodStatus,
          subscriptionStatus: state.billing.subscriptionStatus,
        },
      };
    case 'addTransaction': {
      const timestamp = new Date().toISOString();
      const transactionId = `tx-${Date.now()}`;
      const receiptId =
        action.payload.kind === 'expense' && action.payload.receipt ? `receipt-${Date.now()}` : null;

      return {
        ...state,
        receipts:
          receiptId && action.payload.receipt
            ? [
                {
                  id: receiptId,
                  vendor: action.payload.receipt.vendor,
                  amount: action.payload.receipt.amount,
                  category: action.payload.receipt.category,
                  confidence: action.payload.receipt.confidence ?? null,
                  status: action.payload.receipt.status ?? 'Needs review',
                  date: timestamp,
                  note:
                    action.payload.receipt.note ?? 'Attached during manual transaction entry',
                  storagePath: action.payload.receipt.storagePath ?? null,
                },
                ...state.receipts,
              ]
            : state.receipts,
        transactions: [
          {
            id: transactionId,
            merchant: action.payload.merchant,
            amount: normalizeTransactionAmount(action.payload.kind, action.payload.amount),
            kind: action.payload.kind,
            category: action.payload.category,
            deductible: action.payload.kind === 'expense' ? action.payload.deductible : false,
            receiptId,
            source: action.payload.source,
            date: timestamp,
            note: action.payload.note,
          },
          ...state.transactions,
        ],
      };
    }
    case 'updateTransaction':
      return {
        ...state,
        transactions: state.transactions.map((transaction) =>
          transaction.id === action.payload.id
            ? {
                ...transaction,
                merchant: action.payload.merchant,
                amount: normalizeTransactionAmount(action.payload.kind, action.payload.amount),
                kind: action.payload.kind,
                category: action.payload.category,
                deductible:
                  action.payload.kind === 'expense' ? action.payload.deductible : false,
                receiptId: transaction.receiptId,
                note: action.payload.note,
              }
            : transaction
        ),
      };
    case 'deleteTransaction':
      return {
        ...state,
        transactions: state.transactions.filter((transaction) => transaction.id !== action.id),
      };
    case 'toggleTransactionDeductible':
      return {
        ...state,
        transactions: state.transactions.map((transaction) =>
          transaction.id === action.id
            ? { ...transaction, deductible: !transaction.deductible }
            : transaction
        ),
      };
    case 'cycleTransactionCategory':
      return {
        ...state,
        transactions: state.transactions.map((transaction) =>
          transaction.id === action.id
            ? { ...transaction, category: nextCategory(transaction.category), deductible: true }
            : transaction
        ),
      };
    case 'addReceipt': {
      const timestamp = new Date().toISOString();
      const receiptId = `receipt-${Date.now()}`;
      const shouldCreateLinkedExpense = !action.payload.transactionId;
      const nextReceipt: Receipt = {
        id: receiptId,
        vendor: action.payload.vendor,
        amount: action.payload.amount,
        category: action.payload.category,
        confidence: action.payload.confidence ?? null,
        status: action.payload.status ?? 'Needs review',
        date: timestamp,
        note: action.payload.note ?? 'Captured inside Lancer',
        storagePath: action.payload.storagePath ?? null,
      };

      return {
        ...state,
        receipts: [nextReceipt, ...state.receipts],
        transactions: shouldCreateLinkedExpense
          ? [
              {
                id: `tx-receipt-${Date.now()}`,
                merchant: action.payload.vendor,
                amount: normalizeTransactionAmount('expense', action.payload.amount),
                kind: 'expense',
                category: action.payload.category,
                deductible: true,
                receiptId,
                source: action.payload.storagePath ? 'Receipt scan' : 'Manual receipt',
                date: timestamp,
                note:
                  action.payload.note ??
                  (action.payload.storagePath
                    ? 'Created from receipt capture'
                    : 'Created from manual receipt'),
              },
              ...state.transactions,
            ]
          : state.transactions.map((transaction) =>
              transaction.id === action.payload.transactionId
                ? { ...transaction, receiptId }
                : transaction
            ),
      };
    }
    case 'deleteReceipt':
      return {
        ...state,
        receipts: state.receipts.filter((receipt) => receipt.id !== action.id),
        transactions: state.transactions.flatMap((transaction) => {
          if (transaction.receiptId !== action.id) {
            return [transaction];
          }

          if (isReceiptGeneratedSource(transaction.source)) {
            return [];
          }

          return [{ ...transaction, receiptId: null }];
        }),
      };
    case 'toggleReceiptVerified':
      return {
        ...state,
        receipts: state.receipts.map((receipt) =>
          receipt.id === action.id
            ? {
                ...receipt,
                status: receipt.status === 'Verified' ? 'Needs review' : 'Verified',
              }
            : receipt
        ),
      };
    case 'addTrip':
      return {
        ...state,
        trips: [
          {
            id: `trip-${Date.now()}`,
            classification: action.payload.classification ?? 'Business',
            date: new Date().toISOString(),
            ...action.payload,
          },
          ...state.trips,
        ],
      };
    case 'deleteTrip':
      return {
        ...state,
        trips: state.trips.filter((trip) => trip.id !== action.id),
      };
    case 'cycleTripClassification':
      return {
        ...state,
        trips: state.trips.map((trip) =>
          trip.id === action.id
            ? { ...trip, classification: nextClassification(trip.classification) }
            : trip
        ),
      };
    case 'setReservePercent':
      return {
        ...state,
        reservePercent: Math.max(10, Math.min(45, action.value)),
      };
    case 'setActivePlan':
      return {
        ...state,
        activePlan: action.plan,
      };
    case 'updateAvatar':
      return {
        ...state,
        profile: {
          ...state.profile,
          avatarUrl: action.url,
        },
      };
    case 'updateProfile':
      return {
        ...state,
        profile: {
          ...state.profile,
          currency: action.payload.currency,
          homeState: action.payload.homeState,
          name: action.payload.name,
          role: action.payload.role,
        },
      };
    default:
      return state;
  }
}

export function LedgerProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(ledgerReducer, initialState);
  const [isHydratingAuth, setIsHydratingAuth] = useState(usingSupabaseBackend);
  const [authBusy, setAuthBusy] = useState(false);
  const supabase = useMemo(() => getSupabaseClient(), []);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus | null | undefined) ?? 'active');

  const hydrateFromSessionUser = useCallback(
    async (user: User, options?: { showLoader?: boolean }) => {
      if (!supabase) {
        return;
      }

      const showLoader = options?.showLoader ?? true;

      if (showLoader) {
        setIsHydratingAuth(true);
      }

      const [profileResult, transactionsResult, receiptsResult, tripsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('occurred_at', { ascending: false }),
        supabase
          .from('receipts')
          .select('*')
          .eq('user_id', user.id)
          .order('captured_at', { ascending: false }),
        supabase
          .from('mileage_trips')
          .select('*')
          .eq('user_id', user.id)
          .order('occurred_at', { ascending: false }),
      ]);

      if (profileResult.error && profileResult.error.code !== 'PGRST116') {
        console.warn('Unable to load profile from Supabase:', profileResult.error.message);
      }

      if (transactionsResult.error) {
        console.warn('Unable to load transactions from Supabase:', transactionsResult.error.message);
      }

      if (receiptsResult.error) {
        console.warn('Unable to load receipts from Supabase:', receiptsResult.error.message);
      }

      if (tripsResult.error) {
        console.warn('Unable to load trips from Supabase:', tripsResult.error.message);
      }

      const profileRow = profileResult.data;
      const googleProfile = fallbackProfileFromUser(user);
      const fallbackBilling = fallbackBillingFromUser();
      const profile = profileRow
        ? {
            ...mapProfileRowToUserProfile(profileRow),
            avatarUrl: profileRow.avatar_url || googleProfile.avatarUrl,
          }
        : googleProfile;
      const billing = profileRow
        ? {
            ...mapProfileRowToBillingSnapshot(profileRow),
            paymentMethodStatus: toPaymentMethodStatus(profileRow.payment_method_status),
            subscriptionStatus: toSubscriptionStatus(profileRow.subscription_status),
          }
        : fallbackBilling;

      // Auto-sync Google photo to DB if missing
      if (profileRow && !profileRow.avatar_url && googleProfile.avatarUrl && usingSupabaseBackend) {
        void supabase
          .from('profiles')
          .update({ avatar_url: googleProfile.avatarUrl })
          .eq('id', user.id)
          .then(({ error }) => {
            if (error) console.warn('Failed to auto-sync avatar to DB:', error.message);
          });
      }

      dispatch({
        type: 'hydrateSession',
        payload: {
          activePlan: toPlanTier(profileRow?.active_plan),
          billing,
          onboardingComplete: profileRow?.onboarding_complete ?? false,
          profile,
          receipts: (receiptsResult.data ?? []).map(mapReceiptRowToReceipt),
          reservePercent: profileRow?.reserve_percent ?? 28,
          transactions: (transactionsResult.data ?? []).map(mapTransactionRowToTransaction),
          trips: (tripsResult.data ?? []).map(mapTripRowToMileageTrip),
        },
      });

      if (user.email) {
        void rememberAccount({ email: user.email, name: profile.name, avatarUrl: profile.avatarUrl ?? null });
      }

      setIsHydratingAuth(false);
    },
    [supabase]
  );

  const refreshFromServer = useCallback(async () => {
    if (!supabase) {
      return;
    }

    const { data, error } = await supabase.auth.getUser();

    if (error) {
      console.warn('Unable to refresh the current user session:', error.message);
      return;
    }

    if (data.user) {
      await hydrateFromSessionUser(data.user, { showLoader: false });
    }
  }, [hydrateFromSessionUser, supabase]);

  const scheduleRefreshFromServer = useCallback(
    (delayMs = 250) => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null;
        void refreshFromServer();
      }, delayMs);
    },
    [refreshFromServer]
  );

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      setIsHydratingAuth(false);
      return;
    }

    let active = true;

    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (error) {
        console.warn('Unable to hydrate Supabase session:', error.message);

        // Self-healing: if the session is corrupted (e.g. invalid refresh token),
        // we force a sign out to clear the bad state.
        if (error.message.includes('Refresh Token') || error.message.includes('Invalid')) {
          await supabase.auth.signOut();
          dispatch({ type: 'endSession' });
        }

        setIsHydratingAuth(false);
        return;
      }

      if (data.session?.user) {
        await hydrateFromSessionUser(data.session.user);
      } else {
        dispatch({ type: 'endSession' });
        setIsHydratingAuth(false);
      }
    };

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      if (!active) {
        return;
      }

      if (session?.user) {
        void hydrateFromSessionUser(session.user);
      } else {
        dispatch({ type: 'endSession' });
        setIsHydratingAuth(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [hydrateFromSessionUser, supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    const hydrateFromUrl = async (url: string | null) => {
      if (!url || !active) {
        return;
      }

      try {
        const session = await createSessionFromUrl(supabase, url);

        if (session?.user && active) {
          await hydrateFromSessionUser(session.user);
        }
      } catch (error) {
        console.warn(
          'Unable to restore the auth session from a redirect URL:',
          error instanceof Error ? error.message : error
        );
      }
    };

    void Linking.getInitialURL().then((url) => {
      void hydrateFromUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void hydrateFromUrl(url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [hydrateFromSessionUser, supabase]);

  useEffect(() => {
    if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackgrounded =
        appStateRef.current === 'background' || appStateRef.current === 'inactive';

      appStateRef.current = nextAppState;

      if (wasBackgrounded && nextAppState === 'active') {
        scheduleRefreshFromServer(0);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [scheduleRefreshFromServer, state.isAuthenticated, supabase]);

  useEffect(() => {
    if (
      !supabase ||
      !usingSupabaseBackend ||
      !state.isAuthenticated ||
      !state.profile.id
    ) {
      return;
    }

    const userId = state.profile.id;
    const channel = supabase
      .channel(`ledger-live-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `id=eq.${userId}`,
          schema: 'public',
          table: 'profiles',
        },
        () => {
          scheduleRefreshFromServer();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `user_id=eq.${userId}`,
          schema: 'public',
          table: 'transactions',
        },
        () => {
          scheduleRefreshFromServer();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `user_id=eq.${userId}`,
          schema: 'public',
          table: 'receipts',
        },
        () => {
          scheduleRefreshFromServer();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `user_id=eq.${userId}`,
          schema: 'public',
          table: 'mileage_trips',
        },
        () => {
          scheduleRefreshFromServer();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Realtime sync disconnected. Pulling fresh data instead.');
          scheduleRefreshFromServer(0);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [scheduleRefreshFromServer, state.isAuthenticated, state.profile.id, supabase]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase || !usingSupabaseBackend) {
        dispatch({
          type: 'startSession',
          name: email.split('@')[0]?.trim() || defaultProfile.name,
        });
        return;
      }

      setAuthBusy(true);

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          throw new Error(error.message);
        }

        await refreshFromServer();
      } finally {
        setAuthBusy(false);
      }
    },
    [refreshFromServer, supabase]
  );

  const signUpWithEmail = useCallback(
    async ({
      email,
      name,
      password,
    }: {
      email: string;
      name: string;
      password: string;
    }): Promise<SignUpResult> => {
      if (!supabase || !usingSupabaseBackend) {
        dispatch({
          type: 'startSession',
          name: name.trim() || email.split('@')[0]?.trim() || defaultProfile.name,
        });

        return 'authenticated';
      }

      setAuthBusy(true);

      try {
        const cleanName = name.trim() || email.split('@')[0]?.trim() || defaultProfile.name;
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: cleanName,
            },
            emailRedirectTo: getAuthRedirectUrl(),
          },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data.session?.user) {
          await hydrateFromSessionUser(data.session.user);
          return 'authenticated';
        }

        return 'confirm-email';
      } finally {
        setAuthBusy(false);
      }
    },
    [hydrateFromSessionUser, supabase]
  );

  const sendPasswordResetEmail = useCallback(
    async (email: string) => {
      if (!supabase || !usingSupabaseBackend) {
        // Mock success for offline mode
        return;
      }

      setAuthBusy(true);

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: getAuthRedirectUrl(),
        });

        if (error) {
          throw new Error(error.message);
        }
      } finally {
        setAuthBusy(false);
      }
    },
    [supabase]
  );

  const signInWithGoogle = useCallback(async (loginHint?: string) => {
    if (!supabase || !usingSupabaseBackend) {
      dispatch({
        type: 'startSession',
        name: defaultProfile.name,
      });
      return;
    }

    setAuthBusy(true);

    try {
      const redirectTo = getAuthRedirectUrl();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          // A remembered account goes straight in; otherwise always let people pick.
          queryParams: loginHint ? { login_hint: loginHint } : { prompt: 'select_account' },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.url) {
        throw new Error('Google sign-in could not start.');
      }

      // Add a small delay to prevent race conditions in Safari/iOS
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('Google sign-in was cancelled.');
      }

      if (result.type !== 'success' || !result.url) {
        throw new Error('Google sign-in did not return a valid session.');
      }

      await createSessionFromUrl(supabase, result.url);
      await refreshFromServer();
    } finally {
      setAuthBusy(false);
    }
  }, [refreshFromServer, supabase]);

  const signOut = useCallback(async () => {
    if (!supabase || !usingSupabaseBackend) {
      await clearRevenueCatCustomer();
      dispatch({ type: 'endSession' });
      return;
    }

    setAuthBusy(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }

      await clearRevenueCatCustomer();
      dispatch({ type: 'endSession' });
    } finally {
      setAuthBusy(false);
    }
  }, [supabase]);

  const deleteAccount = useCallback(async () => {
    if (!supabase || !usingSupabaseBackend) {
      await clearRevenueCatCustomer();
      dispatch({ type: 'endSession' });
      return;
    }

    setAuthBusy(true);

    try {
      const { data: current } = await supabase.auth.getUser();
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { confirm: true },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (current.user?.email) {
        await forgetAccount(current.user.email);
      }

      await supabase.auth.signOut();
      await clearRevenueCatCustomer();
      dispatch({ type: 'endSession' });
    } finally {
      setAuthBusy(false);
    }
  }, [supabase]);

  const addTransaction = useCallback(
    async (payload: AddTransactionPayload) => {
      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'addTransaction', payload });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'addTransaction', payload });
        return;
      }

      const { data: transactionRow, error: insertError } = await supabase
        .from('transactions')
        .insert(buildTransactionInsert(user.id, payload))
        .select('id')
        .single();

      if (insertError || !transactionRow) {
        throw new Error(insertError?.message ?? 'Unable to save the transaction.');
      }

      if (payload.kind === 'expense' && payload.receipt) {
        const { data: receiptRow, error: receiptError } = await supabase
          .from('receipts')
          .insert(
            buildReceiptInsert(user.id, {
              ...payload.receipt,
              transactionId: transactionRow.id,
            })
          )
          .select('id')
          .single();

        if (receiptError || !receiptRow) {
          await supabase.from('transactions').delete().eq('id', transactionRow.id).eq('user_id', user.id);
          throw new Error(receiptError?.message ?? 'Unable to save the receipt attachment.');
        }

        const { error: linkError } = await supabase
          .from('transactions')
          .update({ receipt_id: receiptRow.id })
          .eq('id', transactionRow.id)
          .eq('user_id', user.id);

        if (linkError) {
          await supabase.from('receipts').delete().eq('id', receiptRow.id).eq('user_id', user.id);
          await supabase.from('transactions').delete().eq('id', transactionRow.id).eq('user_id', user.id);
          throw new Error(linkError.message);
        }
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, supabase]
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'deleteTransaction', id });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'deleteTransaction', id });
        return;
      }

      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, supabase]
  );

  const updateTransaction = useCallback(
    async (payload: UpdateTransactionPayload) => {
      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'updateTransaction', payload });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'updateTransaction', payload });
        return;
      }

      const { error: updateError } = await supabase
        .from('transactions')
        .update(buildTransactionUpdate(payload))
        .eq('id', payload.id)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, supabase]
  );

  const toggleTransactionDeductible = useCallback(
    async (id: string) => {
      const transaction = state.transactions.find((item) => item.id === id);

      if (!transaction) {
        return;
      }

      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'toggleTransactionDeductible', id });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'toggleTransactionDeductible', id });
        return;
      }

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ deductible: !transaction.deductible })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, state.transactions, supabase]
  );

  const cycleTransactionCategory = useCallback(
    async (id: string) => {
      const transaction = state.transactions.find((item) => item.id === id);

      if (!transaction) {
        return;
      }

      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'cycleTransactionCategory', id });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'cycleTransactionCategory', id });
        return;
      }

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ category: nextCategory(transaction.category), deductible: true })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, state.transactions, supabase]
  );

  const updateAvatar = useCallback(
    async (uri: string) => {
      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'updateAvatar', url: uri });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'updateAvatar', url: uri });
        return;
      }

      // 1. Upload to storage
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // We need to convert URI to blob for Supabase upload
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // 2. Get public URL
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = publicUrlData.publicUrl;

      // 3. Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, supabase]
  );

  const updateProfile = useCallback(
    async (payload: UpdateProfilePayload) => {
      const nextPayload = {
        currency: payload.currency || state.profile.currency,
        homeState: payload.homeState.trim() || state.profile.homeState,
        name: payload.name.trim() || state.profile.name,
        role: payload.role.trim() || state.profile.role,
      };

      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'updateProfile', payload: nextPayload });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'updateProfile', payload: nextPayload });
        return;
      }

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: nextPayload.name,
        },
      });

      if (metadataError) {
        throw new Error(metadataError.message);
      }

      await writeProfile(supabase, user.id, buildEditableProfileUpdate(nextPayload));

      await hydrateFromSessionUser(user);
    },
    [
      hydrateFromSessionUser,
      state.isAuthenticated,
      state.profile.currency,
      state.profile.homeState,
      state.profile.name,
      state.profile.role,
      supabase,
    ]
  );

  const addReceipt = useCallback(
    async (payload: AddReceiptPayload) => {
      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'addReceipt', payload });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'addReceipt', payload });
        return;
      }

      const { data: receiptRow, error: receiptError } = await supabase
        .from('receipts')
        .insert(buildReceiptInsert(user.id, payload))
        .select('*')
        .single();

      if (receiptError) {
        throw new Error(receiptError.message);
      }

      if (payload.transactionId) {
        const { error: transactionLinkError } = await supabase
          .from('transactions')
          .update({ receipt_id: receiptRow.id })
          .eq('id', payload.transactionId)
          .eq('user_id', user.id);

        if (transactionLinkError) {
          await supabase.from('receipts').delete().eq('id', receiptRow.id).eq('user_id', user.id);
          throw new Error(transactionLinkError.message);
        }
      } else {
        const transactionPayload: AddTransactionPayload = {
          amount: payload.amount,
          category: payload.category,
          deductible: true,
          kind: 'expense',
          merchant: payload.vendor,
          note:
            payload.note ??
            (payload.storagePath ? 'Created from receipt capture' : 'Created from manual receipt'),
          source: payload.storagePath ? 'Receipt scan' : 'Manual receipt',
        };

        const { error: transactionError } = await supabase.from('transactions').insert({
          ...buildTransactionInsert(user.id, transactionPayload),
          receipt_id: receiptRow.id,
        });

        if (transactionError) {
          await supabase.from('receipts').delete().eq('id', receiptRow.id).eq('user_id', user.id);
          throw new Error(transactionError.message);
        }
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, supabase]
  );

  const deleteReceipt = useCallback(
    async (id: string) => {
      const receipt = state.receipts.find((item) => item.id === id);
      const linkedTransactions = state.transactions.filter((transaction) => transaction.receiptId === id);

      if (!receipt) {
        return;
      }

      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'deleteReceipt', id });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'deleteReceipt', id });
        return;
      }

      const generatedTransactionIds = linkedTransactions
        .filter((transaction) => isReceiptGeneratedSource(transaction.source))
        .map((transaction) => transaction.id);
      const attachedTransactionIds = linkedTransactions
        .filter((transaction) => !isReceiptGeneratedSource(transaction.source))
        .map((transaction) => transaction.id);

      if (attachedTransactionIds.length > 0) {
        const { error: unlinkError } = await supabase
          .from('transactions')
          .update({ receipt_id: null })
          .eq('user_id', user.id)
          .in('id', attachedTransactionIds);

        if (unlinkError) {
          throw new Error(unlinkError.message);
        }
      }

      if (generatedTransactionIds.length > 0) {
        const { error: transactionDeleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('user_id', user.id)
          .in('id', generatedTransactionIds);

        if (transactionDeleteError) {
          throw new Error(transactionDeleteError.message);
        }
      }

      const { error: receiptDeleteError } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (receiptDeleteError) {
        throw new Error(receiptDeleteError.message);
      }

      if (receipt.storagePath) {
        const { error: storageError } = await supabase.storage
          .from('receipts')
          .remove([receipt.storagePath]);

        if (storageError) {
          console.warn('Unable to remove receipt file from storage:', storageError.message);
        }
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, state.receipts, state.transactions, supabase]
  );

  const toggleReceiptVerified = useCallback(
    async (id: string) => {
      const receipt = state.receipts.find((item) => item.id === id);

      if (!receipt) {
        return;
      }

      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'toggleReceiptVerified', id });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'toggleReceiptVerified', id });
        return;
      }

      const nextStatus = receipt.status === 'Verified' ? 'Needs review' : 'Verified';
      const { error: updateError } = await supabase
        .from('receipts')
        .update({ status: nextStatus })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, state.receipts, supabase]
  );

  const addTrip = useCallback(
    async (payload: AddTripPayload) => {
      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'addTrip', payload });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'addTrip', payload });
        return;
      }

      const { error: insertError } = await supabase
        .from('mileage_trips')
        .insert(buildTripInsert(user.id, payload));

      if (insertError) {
        throw new Error(insertError.message);
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, supabase]
  );

  const deleteTrip = useCallback(
    async (id: string) => {
      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'deleteTrip', id });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'deleteTrip', id });
        return;
      }

      const { error: deleteError } = await supabase
        .from('mileage_trips')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, supabase]
  );

  const cycleTripClassification = useCallback(
    async (id: string) => {
      const trip = state.trips.find((item) => item.id === id);

      if (!trip) {
        return;
      }

      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'cycleTripClassification', id });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'cycleTripClassification', id });
        return;
      }

      const { error: updateError } = await supabase
        .from('mileage_trips')
        .update({ classification: nextClassification(trip.classification) })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, state.trips, supabase]
  );

  const setReservePercent = useCallback(
    async (value: number) => {
      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'setReservePercent', value });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'setReservePercent', value });
        return;
      }

      const nextValue = Math.max(10, Math.min(45, value));
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ reserve_percent: nextValue })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, supabase]
  );

  const setActivePlan = useCallback(
    async (plan: PlanTier) => {
      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'setActivePlan', plan });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'setActivePlan', plan });
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ active_plan: plan })
        .eq('id', user.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, supabase]
  );

  const completeBillingSetup = useCallback(
    async ({
      plan,
      withCard,
      paymentMethodStatus: explicitPaymentMethodStatus,
    }: {
      plan: PlanTier;
      paymentMethodStatus?: PaymentMethodStatus;
      withCard: boolean;
    }) => {
      const paymentMethodStatus: PaymentMethodStatus =
        explicitPaymentMethodStatus ?? (withCard ? 'pending' : 'missing');

      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({
          type: 'completeBillingSetup',
          payload: {
            paymentMethodStatus,
            plan,
          },
        });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({
          type: 'completeBillingSetup',
          payload: {
            paymentMethodStatus,
            plan,
          },
        });
        return;
      }

      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            active_plan: plan,
            billing_setup_complete: true,
            payment_method_status: paymentMethodStatus,
          })
          .eq('id', user.id);

        if (updateError) {
          // If the user is skipping, don't block them with database errors (e.g. missing columns)
          if (!withCard) {
            if (isMissingProfilesColumnError(updateError.message)) {
              warnMissingBillingColumnsOnce(updateError.message);
            } else {
              console.warn('Billing setup DB update failed, but allowing skip:', updateError.message);
            }
            dispatch({
              type: 'completeBillingSetup',
              payload: { paymentMethodStatus, plan },
            });
            return;
          }

          if (isMissingProfilesColumnError(updateError.message)) {
            warnMissingBillingColumnsOnce(updateError.message);
            throw new Error(
              'Supabase billing columns are still missing. Run 20260422_0004_launch_access.sql, then try again.'
            );
          }

          throw new Error(updateError.message);
        }

        await hydrateFromSessionUser(user);
      } catch (error) {
        if (!withCard) {
          if (error instanceof Error && isMissingProfilesColumnError(error.message)) {
            warnMissingBillingColumnsOnce(error.message);
          } else {
            console.warn(
              'Billing setup failed silently during skip:',
              error instanceof Error ? error.message : error
            );
          }
          dispatch({
            type: 'completeBillingSetup',
            payload: { paymentMethodStatus, plan },
          });
          return;
        }
        throw error;
      }
    },
    [hydrateFromSessionUser, state.isAuthenticated, supabase]
  );

  const completeOnboarding = useCallback(
    async (payload: OnboardingPayload) => {
      if (!supabase || !usingSupabaseBackend || !state.isAuthenticated) {
        dispatch({ type: 'completeOnboarding', payload });
        return;
      }

      const { data, error } = await supabase.auth.getUser();
      const user = data.user;

      if (error || !user) {
        dispatch({ type: 'completeOnboarding', payload });
        return;
      }

      await writeProfile(supabase, user.id, {
        ...buildProfileUpdate(payload),
        reserve_percent: getReservePercentForIncomeStyle(payload.incomeStyle),
      });

      await hydrateFromSessionUser(user);
    },
    [hydrateFromSessionUser, state.isAuthenticated, supabase]
  );

  // Set synchronously during render so every screen below formats with the right currency on this pass.
  setDisplayCurrency(state.profile.currency);

  // Every money figure is for the current calendar year, which is how taxes are filed.
  const year = useMemo(
    () => getYearSummary(state.transactions, state.trips, state.reservePercent),
    [state.reservePercent, state.transactions, state.trips]
  );
  const uncategorizedReceiptValue = state.receipts.reduce(
    (total, receipt) => total + (receipt.status === 'Needs review' ? receipt.amount : 0),
    0
  );
  const { mileageWriteOff, netProfit, reserveTarget } = year;
  const deductibleTotal = year.deductibleExpenses + mileageWriteOff;
  const quarters = useMemo(() => getQuarterEstimates(netProfit, state.reservePercent), [netProfit, state.reservePercent]);
  const nextQuarter = quarters.find((quarter) => quarter.status === 'Next up') ?? quarters[0];
  const reserveGap = getReserveGap(nextQuarter?.amountDue ?? 0, reserveTarget);
  const accounts = Array.from(new Set(state.transactions.map((transaction) => transaction.source)));
  const hasRecentTrip = state.trips.some((trip) => {
    const tripTimestamp = new Date(trip.date).getTime();
    return tripTimestamp >= Date.now() - 7 * 24 * 60 * 60 * 1000;
  });
  const isTrialExpired =
    Boolean(state.billing.trialEndsAt) &&
    new Date(state.billing.trialEndsAt as string).getTime() <= Date.now();
  const isBlocked = state.billing.subscriptionStatus !== 'active' && isTrialExpired;
  const trialDaysRemaining = getTrialDaysRemaining(state.billing.trialEndsAt);

  useEffect(() => {
    if (!state.isAuthenticated || !state.onboardingComplete) {
      return;
    }

    // Reminders run for everyone once setup is done; scheduling never prompts for permission.
    void syncLocalReminders({
      hasRecentTrip,
      hasTransactions: state.transactions.length > 0,
      mileageMode: state.profile.mileageMode,
      quarters,
      receiptsToReview: state.receipts.filter((receipt) => receipt.status === 'Needs review').length,
      transactionsToReview: state.transactions.filter(
        (transaction) => !transaction.category?.trim() || transaction.category === 'Uncategorized'
      ).length,
    }).catch((error) => console.warn('Reminders could not be scheduled:', error));
  }, [
    hasRecentTrip,
    quarters,
    state.isAuthenticated,
    state.onboardingComplete,
    state.profile.mileageMode,
    state.receipts,
    state.transactions,
  ]);

  const value = useMemo<LedgerContextValue>(
    () => ({
      ...state,
      accounts,
      authBusy,
      backendMode: env.backendMode,
      isHydratingAuth,
      quarters,
      usingLiveBackend: usingSupabaseBackend,
      access: {
        billingSetupComplete: state.billing.billingSetupComplete,
        isBlocked,
        isTrialExpired,
        paymentMethodStatus: state.billing.paymentMethodStatus,
        subscriptionStatus: state.billing.subscriptionStatus,
        trialDaysRemaining,
        trialEndsAt: state.billing.trialEndsAt,
      },
      metrics: {
        year: year.year,
        income: year.income,
        expenses: year.expenses,
        netProfit,
        deductibleTotal,
        mileageWriteOff,
        reserveTarget,
        reserveGap,
        taxPaid: year.taxPaid,
        stillToSetAside: year.stillToSetAside,
        afterTaxIncome: year.afterTaxIncome,
        uncategorizedReceiptValue,
      },
      auth: {
        deleteAccount,
        signInWithGoogle,
        signInWithEmail,
        signOut,
        signUpWithEmail,
        sendPasswordResetEmail,
      },
      actions: {
        addTransaction,
        addReceipt,
        addTrip,
        completeBillingSetup,
        completeOnboarding,
        cycleTransactionCategory,
        cycleTripClassification,
        deleteReceipt,
        deleteTransaction,
        deleteTrip,
        refreshData: refreshFromServer,
        setActivePlan,
        setReservePercent,
        startSession: (name) =>
          dispatch({
            type: 'startSession',
            name: name.trim() || defaultProfile.name,
          }),
        toggleReceiptVerified,
        toggleTransactionDeductible,
        updateTransaction,
        updateAvatar,
        updateProfile,
      },
    }),
    [
      accounts,
      addReceipt,
      addTransaction,
      addTrip,
      authBusy,
      completeBillingSetup,
      completeOnboarding,
      cycleTransactionCategory,
      cycleTripClassification,
      deleteReceipt,
      deleteTransaction,
      deleteTrip,
      deleteAccount,
      deductibleTotal,
      isHydratingAuth,
      isBlocked,
      isTrialExpired,
      mileageWriteOff,
      netProfit,
      quarters,
      refreshFromServer,
      reserveGap,
      reserveTarget,
      setActivePlan,
      setReservePercent,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      signUpWithEmail,
      sendPasswordResetEmail,
      state,
      toggleReceiptVerified,
      toggleTransactionDeductible,
      year,
      trialDaysRemaining,
      uncategorizedReceiptValue,
      updateAvatar,
      updateProfile,
      updateTransaction,
    ]
  );

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger() {
  const context = useContext(LedgerContext);

  if (!context) {
    throw new Error('useLedger must be used inside LedgerProvider');
  }

  return context;
}
