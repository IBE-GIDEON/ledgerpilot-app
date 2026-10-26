import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

import { formatCurrency, formatFullDate } from '@/lib/formatters';
import { bankOf, getBankTotals, getCategoryTotals, getTotals } from '@/lib/summary';
import { Receipt, Transaction, UserProfile } from '@/types/ledger';

export type StatementInput = {
  year: number;
  profile: UserProfile;
  transactions: Transaction[];
  receipts: Receipt[];
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

/** A printable statement of the year's money in and money out, as HTML (rendered to PDF). */
export function buildStatementHtml(input: StatementInput) {
  const { year, profile } = input;
  const now = new Date(year, 11, 31);
  const transactions = input.transactions.filter((item) => inYear(item.date, year)).sort(byDate);
  const totals = getTotals(input.transactions, 'year', now);
  const moneyIn = getCategoryTotals(input.transactions, 'income', 'year', now);
  const moneyOut = getCategoryTotals(input.transactions, 'expense', 'year', now);
  const receipts = input.receipts.filter((item) => inYear(item.date, year)).length;
  const preparedFor = [profile.name, profile.role].filter((part) => part?.trim()).join(' · ');

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
</style></head><body>
  <h1>Lancer ${year} statement</h1>
  <div class="muted">${escapeHtml(preparedFor || 'Prepared from Lancer records')} · Generated ${escapeHtml(formatFullDate(new Date().toISOString()))}</div>

  <h2>Summary</h2>
  <table class="summary"><tbody>
    <tr><td>Money in</td><td class="num">${money(totals.income)}</td></tr>
    <tr><td>Money out</td><td class="num">${money(totals.expenses)}</td></tr>
    <tr class="total"><td>Left over</td><td class="num">${money(totals.net)}</td></tr>
  </tbody></table>

  <h2>By bank</h2>
  ${table(
    ['Bank', 'In', 'Out', 'Left over'],
    getBankTotals(input.transactions, 'year', now).map((item) => [item.bank, money(item.income), money(item.expenses), money(item.net)]),
    1
  )}

  <h2>Money in by category</h2>
  ${table(['Category', 'Total'], moneyIn.map((item) => [item.category, money(item.total)]), 1)}

  <h2>Money out by category</h2>
  ${table(['Category', 'Total'], moneyOut.map((item) => [item.category, money(item.total)]), 1)}

  <h2>Transactions</h2>
  ${table(
    ['When', 'Merchant', 'Category', 'Bank', 'Type', 'Amount'],
    transactions.map((item) => [
      item.date.slice(0, 16).replace('T', ' '),
      item.merchant,
      item.category || 'Uncategorized',
      bankOf(item),
      item.kind === 'income' ? 'In' : 'Out',
      money(Math.abs(item.amount)),
    ]),
    5
  )}

  <h2>Receipts</h2>
  <div>${receipts} receipts stored for ${year}.</div>
</body></html>`;
}

/** Every transaction for the year, one row each, for Excel, Numbers or Google Sheets. */
export function buildTransactionsCsv(input: Pick<StatementInput, 'year' | 'transactions'>) {
  const header = ['date', 'time', 'type', 'merchant', 'category', 'amount', 'bank', 'note'];
  const rows = input.transactions
    .filter((item) => inYear(item.date, input.year))
    .sort(byDate)
    .map((item) =>
      [
        day(item.date),
        new Date(item.date).toTimeString().slice(0, 5),
        item.kind === 'income' ? 'in' : 'out',
        item.merchant,
        item.category || 'Uncategorized',
        (item.kind === 'income' ? 1 : -1) * Math.abs(item.amount),
        bankOf(item),
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

export async function shareStatementPdf(input: StatementInput) {
  const { uri } = await Print.printToFileAsync({ html: buildStatementHtml(input) });
  const named = await freshFile(`Lancer-${input.year}-statement.pdf`);
  await new File(uri).move(named);
  await Sharing.shareAsync(named.uri, {
    dialogTitle: `Lancer ${input.year} statement`,
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
}

export async function shareTransactionsCsv(input: Pick<StatementInput, 'year' | 'transactions'>) {
  const file = await freshFile(`Lancer-${input.year}-transactions.csv`);
  file.create();
  await file.write(buildTransactionsCsv(input));
  await Sharing.shareAsync(file.uri, {
    dialogTitle: `Lancer ${input.year} transactions`,
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
  });
}
