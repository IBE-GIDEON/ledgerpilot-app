import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

import { getDeductionsByCategory, getExpensesByCategory, getMileageSummary } from '@/components/taxes/tax-summary';
import { formatCurrency, formatFullDate } from '@/lib/formatters';
import { isTaxPayment } from '@/lib/tax';
import { MileageTrip, Receipt, Transaction, UserProfile } from '@/types/ledger';

export type PacketInput = {
  year: number;
  profile: UserProfile;
  transactions: Transaction[];
  receipts: Receipt[];
  trips: MileageTrip[];
  reservePercent: number;
  metrics: {
    income: number;
    expenses: number;
    netProfit: number;
    deductibleTotal: number;
    mileageWriteOff: number;
    reserveTarget: number;
    taxPaid: number;
  };
};

const inYear = (date: string, year: number) => new Date(date).getFullYear() === year;
const byDate = <T extends { date: string }>(a: T, b: T) => new Date(a.date).getTime() - new Date(b.date).getTime();
const money = (value: number) => formatCurrency(value, 2);
const day = (date: string) => date.slice(0, 10);

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

function table(headers: string[], rows: (string | number)[][], numericFrom = headers.length) {
  const head = headers.map((cell, index) => `<th class="${index >= numericFrom ? 'num' : ''}">${escapeHtml(cell)}</th>`);
  const body = rows.map(
    (row) =>
      `<tr>${row
        .map((cell, index) => `<td class="${index >= numericFrom ? 'num' : ''}">${escapeHtml(String(cell))}</td>`)
        .join('')}</tr>`
  );
  return `<table><thead><tr>${head.join('')}</tr></thead><tbody>${body.join('') || `<tr><td colspan="${headers.length}" class="muted">None recorded</td></tr>`}</tbody></table>`;
}

/** A printable, accountant-friendly summary of the year as HTML (rendered to PDF). */
export function buildPacketHtml(input: PacketInput) {
  const { year, profile, metrics, reservePercent } = input;
  const transactions = input.transactions.filter((item) => inYear(item.date, year)).sort(byDate);
  const trips = input.trips.filter((item) => inYear(item.date, year)).sort(byDate);
  const receipts = input.receipts.filter((item) => inYear(item.date, year));
  const expenses = getExpensesByCategory(input.transactions, year);
  const deductions = getDeductionsByCategory(input.transactions, year);
  const mileage = getMileageSummary(trips);
  const verified = receipts.filter((item) => item.status === 'Verified').length;
  const preparedFor = [profile.name, profile.role, profile.homeState].filter((part) => part?.trim()).join(' · ');

  return `<!doctype html><html><head><meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; margin: 32px; font-size: 12px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 28px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .muted { color: #666; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #eee; }
  th { font-size: 11px; color: #555; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .summary td:first-child { width: 60%; }
  .total td { font-weight: 600; border-top: 1px solid #999; }
  footer { margin-top: 32px; font-size: 10px; color: #777; }
</style></head><body>
  <h1>Lancer ${year} tax packet</h1>
  <div class="muted">${escapeHtml(preparedFor || 'Prepared from Lancer records')} · Generated ${escapeHtml(formatFullDate(new Date().toISOString()))}</div>

  <h2>Summary</h2>
  <table class="summary"><tbody>
    <tr><td>Gross income</td><td class="num">${money(metrics.income)}</td></tr>
    <tr><td>Business expenses</td><td class="num">${money(metrics.expenses)}</td></tr>
    <tr class="total"><td>Net profit</td><td class="num">${money(metrics.netProfit)}</td></tr>
    <tr><td>Deductible expenses</td><td class="num">${money(metrics.deductibleTotal - metrics.mileageWriteOff)}</td></tr>
    <tr><td>Mileage write-off (${mileage.businessMiles.toFixed(1)} business miles)</td><td class="num">${money(metrics.mileageWriteOff)}</td></tr>
    <tr><td>Estimated tax set aside (${reservePercent}% of profit)</td><td class="num">${money(metrics.reserveTarget)}</td></tr>
    <tr><td>Tax payments recorded</td><td class="num">${money(metrics.taxPaid)}</td></tr>
  </tbody></table>

  <h2>Expenses by category</h2>
  ${table(['Category', 'Total'], expenses.map((item) => [item.category, money(item.total)]), 1)}

  <h2>Deductible expenses by category</h2>
  ${table(['Category', 'Total'], deductions.map((item) => [item.category, money(item.total)]), 1)}

  <h2>Mileage log</h2>
  ${table(
    ['Date', 'From', 'To', 'Purpose', 'Type', 'Miles'],
    trips.map((trip) => [day(trip.date), trip.startLabel, trip.endLabel, trip.purpose || '', trip.classification, trip.miles.toFixed(1)]),
    5
  )}

  <h2>Transactions</h2>
  ${table(
    ['Date', 'Merchant', 'Category', 'Type', 'Deductible', 'Amount'],
    transactions.map((item) => [
      day(item.date),
      item.merchant,
      item.category || 'Uncategorized',
      isTaxPayment(item) ? 'Tax payment' : item.kind === 'income' ? 'Income' : 'Expense',
      item.kind === 'expense' && !isTaxPayment(item) ? (item.deductible ? 'Yes' : 'No') : '',
      money(Math.abs(item.amount)),
    ]),
    5
  )}

  <h2>Receipts</h2>
  <div>${receipts.length} receipts stored for ${year}: ${verified} verified, ${receipts.length - verified} awaiting review.</div>

  <footer>Figures come from records kept in Lancer and are estimates, not tax advice.</footer>
</body></html>`;
}

/** Every transaction for the year, one row each, for Excel, Numbers or Google Sheets. */
export function buildTransactionsCsv(input: Pick<PacketInput, 'year' | 'transactions'>) {
  const header = ['date', 'type', 'merchant', 'category', 'amount', 'deductible', 'account', 'note'];
  const rows = input.transactions
    .filter((item) => inYear(item.date, input.year))
    .sort(byDate)
    .map((item) =>
      [
        day(item.date),
        isTaxPayment(item) ? 'tax payment' : item.kind,
        item.merchant,
        item.category || 'Uncategorized',
        (item.kind === 'income' ? 1 : -1) * Math.abs(item.amount),
        item.kind === 'expense' && !isTaxPayment(item) ? (item.deductible ? 'yes' : 'no') : '',
        item.source,
        item.note,
      ]
        .map((cell) => csvCell(typeof cell === 'number' ? cell.toFixed(2) : cell))
        .join(',')
    );
  return [header.join(','), ...rows].join('\n');
}

/** Replaces any earlier copy so the shared file always carries a clean, readable name. */
async function freshFile(name: string) {
  const file = new File(Paths.cache, name);
  if (file.exists) {
    file.delete();
  }
  return file;
}

export async function sharePacketPdf(input: PacketInput) {
  const { uri } = await Print.printToFileAsync({ html: buildPacketHtml(input) });
  const named = await freshFile(`Lancer-${input.year}-tax-packet.pdf`);
  await new File(uri).move(named);
  await Sharing.shareAsync(named.uri, {
    dialogTitle: `Lancer ${input.year} tax packet`,
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
}

export async function shareTransactionsCsv(input: Pick<PacketInput, 'year' | 'transactions'>) {
  const file = await freshFile(`Lancer-${input.year}-transactions.csv`);
  file.create();
  await file.write(buildTransactionsCsv(input));
  await Sharing.shareAsync(file.uri, {
    dialogTitle: `Lancer ${input.year} transactions`,
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}
