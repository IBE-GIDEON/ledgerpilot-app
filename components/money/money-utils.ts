import { expenseCategories, incomeCategories } from '@/lib/mock-data';
import { Receipt, Transaction, TransactionKind } from '@/types/ledger';

export const transactionFilters = ['All', 'Income', 'Expenses', 'Deductible', 'Needs review'] as const;
export type TransactionFilter = (typeof transactionFilters)[number];

/** Sources the ledger creates itself; anything else came from a linked bank, card or processor. */
export const internalSources = ['Manual entry', 'Receipt scan', 'Manual receipt'];

export const uncategorized = 'Uncategorized';

/** A transaction needs review when it has no category yet or its linked receipt is unverified. */
export function transactionNeedsReview(transaction: Transaction, receiptsById: Map<string, Receipt>) {
  if (!transaction.category || transaction.category === uncategorized) {
    return true;
  }

  const receipt = transaction.receiptId ? receiptsById.get(transaction.receiptId) : undefined;
  return receipt?.status === 'Needs review';
}

export function categoryOptionsFor(kind: TransactionKind, transactions: Transaction[], current?: string) {
  const base: string[] = kind === 'income' ? [...incomeCategories] : [...expenseCategories];
  const used = transactions.filter((item) => item.kind === kind).map((item) => item.category);

  return Array.from(new Set([...(current ? [current] : []), ...base, ...used])).filter(Boolean);
}

/** Parses a money string such as "1,240.50" or "$12"; returns NaN when it is not a positive amount. */
export function parseAmount(value: string) {
  const parsed = Number(value.replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

const knownCategories: string[] = [...expenseCategories, ...incomeCategories];

/** Index into `dataColors` for a category: known categories keep a stable slot, others hash. */
export function categoryColorIndex(category: string | undefined) {
  const name = category || uncategorized;
  const known = knownCategories.indexOf(name);
  if (known >= 0) {
    return known;
  }

  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}
