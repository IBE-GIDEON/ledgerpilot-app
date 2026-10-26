import { Receipt, Transaction } from '@/types/ledger';

/** Money in, money out and what's left over a period. */
export type MoneyTotals = {
  income: number;
  expenses: number;
  net: number;
};

export type Period = 'month' | 'year';

const UNCATEGORISED = new Set(['', 'uncategorized', 'uncategorised']);

function inPeriod(date: string, period: Period, now: Date) {
  const value = new Date(date);
  if (value.getFullYear() !== now.getFullYear()) {
    return false;
  }
  return period === 'year' || value.getMonth() === now.getMonth();
}

export function getTotals(transactions: Transaction[], period: Period, now = new Date()): MoneyTotals {
  let income = 0;
  let expenses = 0;
  for (const transaction of transactions) {
    if (!inPeriod(transaction.date, period, now)) {
      continue;
    }
    const amount = Math.abs(transaction.amount);
    if (transaction.kind === 'income') {
      income += amount;
    } else {
      expenses += amount;
    }
  }
  return { income, expenses, net: income - expenses };
}

/** Totals per category for one side of the ledger, largest first. */
export function getCategoryTotals(
  transactions: Transaction[],
  kind: Transaction['kind'],
  period: Period = 'year',
  now = new Date()
) {
  const grouped = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.kind !== kind || !inPeriod(transaction.date, period, now)) {
      continue;
    }
    const category = transaction.category?.trim() || 'Uncategorized';
    grouped.set(category, (grouped.get(category) ?? 0) + Math.abs(transaction.amount));
  }
  return [...grouped.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}

export function isUncategorized(transaction: Transaction) {
  return UNCATEGORISED.has(transaction.category?.trim().toLowerCase() ?? '');
}

/** Things worth a quick look: transactions without a category and receipts not yet checked. */
export function getReviewCounts(transactions: Transaction[], receipts: Receipt[]) {
  const transactionsToReview = transactions.filter(isUncategorized).length;
  const receiptsToReview = receipts.filter((receipt) => receipt.status === 'Needs review').length;
  return { transactionsToReview, receiptsToReview, total: transactionsToReview + receiptsToReview };
}

export function monthLabel(now = new Date()) {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now);
}

/** Entries without a real bank (typed in by hand, from a receipt) are grouped as cash and other. */
export const OTHER_BANK = 'Cash & other';
const NON_BANK_SOURCES = new Set(['', 'manual entry', 'receipt scan', 'manual receipt']);

export function bankOf(transaction: Transaction) {
  const source = transaction.source?.trim() ?? '';
  return NON_BANK_SOURCES.has(source.toLowerCase()) ? OTHER_BANK : source;
}

export type BankTotals = MoneyTotals & { bank: string; count: number; lastAt: string | null };

/** Money in and out of each bank over a period, busiest bank first; cash and other goes last. */
export function getBankTotals(transactions: Transaction[], period: Period, now = new Date()): BankTotals[] {
  const grouped = new Map<string, BankTotals>();
  for (const transaction of transactions) {
    if (!inPeriod(transaction.date, period, now)) {
      continue;
    }
    const bank = bankOf(transaction);
    const entry = grouped.get(bank) ?? { bank, income: 0, expenses: 0, net: 0, count: 0, lastAt: null };
    const amount = Math.abs(transaction.amount);
    if (transaction.kind === 'income') {
      entry.income += amount;
    } else {
      entry.expenses += amount;
    }
    entry.net = entry.income - entry.expenses;
    entry.count += 1;
    if (!entry.lastAt || transaction.date > entry.lastAt) {
      entry.lastAt = transaction.date;
    }
    grouped.set(bank, entry);
  }
  return [...grouped.values()].sort((a, b) => {
    if (a.bank === OTHER_BANK || b.bank === OTHER_BANK) {
      return a.bank === OTHER_BANK ? 1 : -1;
    }
    return b.income + b.expenses - (a.income + a.expenses);
  });
}

/** Every bank name the person has used, for pickers and filters. */
export function listBanks(transactions: Transaction[]) {
  return [...new Set(transactions.map(bankOf))].filter((bank) => bank !== OTHER_BANK).sort((a, b) => a.localeCompare(b));
}
