import { getMileageWriteOff, isTaxPayment } from '@/lib/tax';
import { MileageTrip, QuarterEstimate, Receipt, Transaction } from '@/types/ledger';

const UNCATEGORISED = new Set(['', 'uncategorized', 'uncategorised']);

/** The quarter marked "Next up", falling back to the first upcoming one. */
export function getNextQuarter(quarters: QuarterEstimate[]) {
  return (
    quarters.find((quarter) => quarter.status === 'Next up') ??
    quarters.find((quarter) => quarter.status === 'Upcoming') ??
    quarters[quarters.length - 1]
  );
}

/**
 * Tax reserve built from profit earned in the quarter's own window: from the previous
 * due date (or 1 January for Q1) up to this quarter's due date.
 */
export function getQuarterReserve(
  quarters: QuarterEstimate[],
  quarter: QuarterEstimate | undefined,
  transactions: Transaction[],
  reservePercent: number
) {
  if (!quarter) {
    return { start: null as Date | null, reserved: 0, progress: 0 };
  }

  const index = quarters.findIndex((item) => item.id === quarter.id);
  const due = new Date(quarter.dueDate);
  const start = index > 0 ? new Date(quarters[index - 1].dueDate) : new Date(due.getFullYear(), 0, 1);

  const profit = transactions.reduce((total, transaction) => {
    const date = new Date(transaction.date);
    if (date < start || date > due) {
      return total;
    }
    const amount = Math.abs(transaction.amount);
    return total + (transaction.kind === 'income' ? amount : -amount);
  }, 0);

  const reserved = Math.max(profit, 0) * (reservePercent / 100);
  const progress = quarter.amountDue > 0 ? Math.min(1, reserved / quarter.amountDue) : 1;

  return { start, reserved, progress };
}

/** Items that still need a decision before tax time. */
export function getReviewCounts(transactions: Transaction[], receipts: Receipt[], trips: MileageTrip[]) {
  const transactionsToReview = transactions.filter(
    (transaction) =>
      transaction.kind === 'expense' &&
      (UNCATEGORISED.has(transaction.category.trim().toLowerCase()) || !transaction.deductible)
  ).length;
  const receiptsToReview = receipts.filter((receipt) => receipt.status === 'Needs review').length;
  const tripsToReview = trips.filter((trip) => trip.classification === 'Mixed').length;

  return {
    transactionsToReview,
    receiptsToReview,
    tripsToReview,
    total: transactionsToReview + receiptsToReview + tripsToReview,
  };
}

/** This year's deductible expense totals by category, largest first. Tax payments are left out. */
export function getDeductionsByCategory(transactions: Transaction[], year = new Date().getFullYear()) {
  const grouped = transactions.reduce<Record<string, number>>((summary, transaction) => {
    if (
      new Date(transaction.date).getFullYear() !== year ||
      isTaxPayment(transaction) ||
      transaction.kind !== 'expense' ||
      !transaction.deductible
    ) {
      return summary;
    }
    const category = transaction.category.trim() || 'Uncategorized';
    summary[category] = (summary[category] ?? 0) + Math.abs(transaction.amount);
    return summary;
  }, {});

  return Object.entries(grouped)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

/** This year's expense totals by category, largest first. Tax payments are left out. */
export function getExpensesByCategory(transactions: Transaction[], year = new Date().getFullYear()) {
  const grouped = transactions.reduce<Record<string, number>>((summary, transaction) => {
    if (
      new Date(transaction.date).getFullYear() !== year ||
      isTaxPayment(transaction) ||
      transaction.kind !== 'expense'
    ) {
      return summary;
    }
    const category = transaction.category.trim() || 'Uncategorized';
    summary[category] = (summary[category] ?? 0) + Math.abs(transaction.amount);
    return summary;
  }, {});

  return Object.entries(grouped)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

/** Business miles (mixed trips count half, matching the write-off rule) and their value. */
export function getMileageSummary(trips: MileageTrip[]) {
  const businessMiles = trips.reduce((total, trip) => {
    if (trip.classification === 'Personal') {
      return total;
    }
    return total + trip.miles * (trip.classification === 'Mixed' ? 0.5 : 1);
  }, 0);

  return { businessMiles, writeOff: getMileageWriteOff(trips), trips: trips.length };
}
