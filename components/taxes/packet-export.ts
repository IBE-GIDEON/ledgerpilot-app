import { formatCurrency, formatFullDate } from '@/lib/formatters';
import { MileageTrip, Receipt, Transaction, UserProfile } from '@/types/ledger';

import { getExpensesByCategory, getMileageSummary } from '@/components/taxes/tax-summary';

type PacketInput = {
  profile: UserProfile;
  transactions: Transaction[];
  receipts: Receipt[];
  trips: MileageTrip[];
  metrics: { income: number; expenses: number; netProfit: number; deductibleTotal: number };
};

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Plain-text packet an accountant can read in any mail or notes app, with CSV sections. */
export function buildPacketText({ profile, transactions, receipts, trips, metrics }: PacketInput) {
  const expenses = getExpensesByCategory(transactions);
  const mileage = getMileageSummary(trips);
  const verified = receipts.filter((receipt) => receipt.status === 'Verified').length;
  const sortedTrips = [...trips].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const lines = [
    'Lancer CPA packet',
    `Prepared for ${profile.name}${profile.role ? `, ${profile.role}` : ''}${profile.homeState ? ` (${profile.homeState})` : ''}`,
    `Generated ${formatFullDate(new Date().toISOString())}`,
    '',
    'SUMMARY',
    `Gross income: ${formatCurrency(metrics.income, 2)}`,
    `Total expenses: ${formatCurrency(metrics.expenses, 2)}`,
    `Net profit: ${formatCurrency(metrics.netProfit, 2)}`,
    `Deductions incl. mileage: ${formatCurrency(metrics.deductibleTotal, 2)}`,
    '',
    'EXPENSES BY CATEGORY',
    'category,total',
    ...expenses.map((item) => `${csvCell(item.category)},${item.total.toFixed(2)}`),
    '',
    'MILEAGE LOG',
    `${trips.length} trips, ${mileage.businessMiles.toFixed(1)} business miles, ${formatCurrency(mileage.writeOff, 2)} write-off`,
    'date,from,to,miles,classification,purpose',
    ...sortedTrips.map((trip) =>
      [trip.date.slice(0, 10), trip.startLabel, trip.endLabel, trip.miles.toFixed(1), trip.classification, trip.purpose]
        .map(csvCell)
        .join(',')
    ),
    '',
    'RECEIPTS',
    `${receipts.length} stored, ${verified} verified, ${receipts.length - verified} need review`,
    '',
    'Figures are informational and based on records kept in Lancer. They are not tax advice.',
  ];

  return lines.join('\n');
}
