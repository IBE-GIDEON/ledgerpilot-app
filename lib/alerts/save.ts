import { PendingAlert } from '@/lib/alerts/inbox';
import { AddTransactionPayload } from '@/lib/backend/payloads';

export const defaultCategory = (kind: PendingAlert['kind']) => (kind === 'income' ? 'Income' : 'Misc');

/** The transaction an answered alert becomes: the bank, the alert's time, and the person's own words. */
export function alertToTransaction(alert: PendingAlert, answer: string, category?: string): AddTransactionPayload {
  const words = answer.trim();
  return {
    amount: alert.amount,
    category: category || defaultCategory(alert.kind),
    deductible: false,
    kind: alert.kind,
    merchant: (alert.counterparty || words).slice(0, 60),
    note: words,
    occurredAt: alert.at,
    source: alert.bank,
  };
}
