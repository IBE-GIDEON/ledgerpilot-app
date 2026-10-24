import { MileageTrip, QuarterEstimate, Transaction } from '@/types/ledger';

export const BUSINESS_MILEAGE_RATE_2026 = 0.725;

const quarterDates = (year: number) => [
  { id: 'q1', label: 'Q1', dueDate: new Date(year, 3, 15) },
  { id: 'q2', label: 'Q2', dueDate: new Date(year, 5, 15) },
  { id: 'q3', label: 'Q3', dueDate: new Date(year, 8, 15) },
  { id: 'q4', label: 'Q4', dueDate: new Date(year + 1, 0, 15) },
];

export function getMileageWriteOff(trips: MileageTrip[]): number {
  return trips.reduce((total, trip) => {
    if (trip.classification === 'Personal') {
      return total;
    }

    const multiplier = trip.classification === 'Mixed' ? 0.5 : 1;
    return total + trip.miles * BUSINESS_MILEAGE_RATE_2026 * multiplier;
  }, 0);
}

export function getTransactionTotals(transactions: Transaction[]) {
  return transactions.reduce(
    (summary, transaction) => {
      if (transaction.kind === 'income') {
        return { ...summary, income: summary.income + transaction.amount };
      }

      const absoluteAmount = Math.abs(transaction.amount);
      return {
        ...summary,
        expenses: summary.expenses + absoluteAmount,
        deductibleExpenses: summary.deductibleExpenses + (transaction.deductible ? absoluteAmount : 0),
      };
    },
    { income: 0, expenses: 0, deductibleExpenses: 0 }
  );
}

export function getQuarterEstimates(netProfit: number, reservePercent: number): QuarterEstimate[] {
  const today = new Date();
  const thisYear = today.getFullYear();
  const annualTaxReserve = Math.max(netProfit, 0) * (reservePercent / 100);
  const equalQuarterAmount = annualTaxReserve / 4;
  const dates = quarterDates(thisYear);

  const nextQuarterIndex = dates.findIndex((quarter) => quarter.dueDate >= today);

  return dates.map((quarter, index) => ({
    id: quarter.id,
    label: quarter.label,
    dueDate: quarter.dueDate.toISOString(),
    amountDue: equalQuarterAmount,
    status:
      nextQuarterIndex === -1 || index < nextQuarterIndex
        ? 'Complete'
        : index === nextQuarterIndex
          ? 'Next up'
          : 'Upcoming',
  }));
}

export function getReserveGap(nextQuarterAmount: number, reserveTarget: number): number {
  const quarterShare = reserveTarget / 4;
  return Math.max(0, nextQuarterAmount - quarterShare);
}

/** Expenses filed under this category are tax already paid, not business costs. */
export const TAX_PAYMENT_CATEGORY = 'Taxes';

export function isTaxPayment(transaction: Transaction) {
  return transaction.kind === 'expense' && transaction.category?.trim().toLowerCase() === 'taxes';
}

function inYear(date: string, year: number) {
  return new Date(date).getFullYear() === year;
}

export type YearSummary = {
  year: number;
  income: number;
  /** Business expenses only; tax payments are counted separately. */
  expenses: number;
  deductibleExpenses: number;
  mileageWriteOff: number;
  netProfit: number;
  /** What to set aside for the year at the chosen rate. */
  reserveTarget: number;
  /** Payments recorded in the Taxes category this year. */
  taxPaid: number;
  /** Set-aside still not covered by payments. */
  stillToSetAside: number;
  /** Profit left after the year's tax set-aside. */
  afterTaxIncome: number;
};

/** Everything the money summaries show, for one calendar year. */
export function getYearSummary(
  transactions: Transaction[],
  trips: MileageTrip[],
  reservePercent: number,
  year = new Date().getFullYear()
): YearSummary {
  let income = 0;
  let expenses = 0;
  let deductibleExpenses = 0;
  let taxPaid = 0;

  for (const transaction of transactions) {
    if (!inYear(transaction.date, year)) {
      continue;
    }
    const amount = Math.abs(transaction.amount);
    if (transaction.kind === 'income') {
      income += amount;
    } else if (isTaxPayment(transaction)) {
      taxPaid += amount;
    } else {
      expenses += amount;
      if (transaction.deductible) {
        deductibleExpenses += amount;
      }
    }
  }

  const mileageWriteOff = getMileageWriteOff(trips.filter((trip) => inYear(trip.date, year)));
  const netProfit = income - expenses;
  const reserveTarget = Math.max(netProfit, 0) * (reservePercent / 100);

  return {
    year,
    income,
    expenses,
    deductibleExpenses,
    mileageWriteOff,
    netProfit,
    reserveTarget,
    taxPaid,
    stillToSetAside: Math.max(reserveTarget - taxPaid, 0),
    afterTaxIncome: netProfit - reserveTarget,
  };
}
