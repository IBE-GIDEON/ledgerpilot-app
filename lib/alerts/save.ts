import { PendingAlert } from '@/lib/alerts/inbox';
import { alertCurrency } from '@/lib/alerts/parse';
import { AddTransactionPayload } from '@/lib/backend/payloads';
import { getDisplayCurrency } from '@/lib/formatters';
import { convert, Converted, formatIn } from '@/lib/fx';

export const defaultCategory = (kind: PendingAlert['kind']) => (kind === 'income' ? 'Income' : 'Misc');

/** The alert's amount in the person's own currency, at today's rate when the alert's money differs. */
export function convertAlert(alert: PendingAlert, to = getDisplayCurrency()): Promise<Converted> {
  return convert(alert.amount, alertCurrency(alert), to);
}

/** "₦5,000 at $1 = ₦1,550.20", so the original money is never lost. */
export function conversionNote(converted: Converted, to = getDisplayCurrency()) {
  const original = converted.original;
  if (!original) return '';
  return `${formatIn(original.amount, original.currency)} at ${formatIn(1, to)} = ${formatIn(1 / original.rate, original.currency)}`;
}

/** The transaction an answered alert becomes: the bank, the alert's time, the person's own words, in their currency. */
export async function alertToTransaction(
  alert: PendingAlert,
  answer: string,
  category?: string
): Promise<AddTransactionPayload> {
  const words = answer.trim();
  const converted = await convertAlert(alert);
  const currency = alertCurrency(alert);
  const extra = converted.original
    ? conversionNote(converted)
    : converted.unconverted && currency
      ? `${formatIn(alert.amount, currency)}, not converted (no rate)`
      : '';
  return {
    amount: converted.amount,
    category: category || defaultCategory(alert.kind),
    deductible: false,
    kind: alert.kind,
    merchant: (alert.counterparty || words).slice(0, 60),
    note: extra ? `${words} · ${extra}` : words,
    occurredAt: alert.at,
    source: alert.bank,
  };
}
