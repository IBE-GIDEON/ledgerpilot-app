import { Receipt, Transaction } from '@/types/ledger';

/** Lower-cased query, or null when there is nothing worth searching for yet. */
export function normalizeQuery(raw: string) {
  const query = raw.trim().toLowerCase();
  return query.length > 0 ? query : null;
}

/**
 * Numbers match amounts loosely: "120" finds 120.00 and 119.99, "12.5" finds 12.50.
 * Returns null when the query isn't a number.
 */
function amountQuery(query: string) {
  const cleaned = query.replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) {
    return null;
  }
  return cleaned;
}

function amountMatches(amount: number, numeric: string) {
  const value = Math.abs(amount);
  return value.toFixed(2).startsWith(numeric) || Math.round(value) === Number(numeric);
}

function textMatches(query: string, fields: (string | null | undefined)[]) {
  return fields.some((field) => field?.toLowerCase().includes(query));
}

export function searchTransactions(transactions: Transaction[], query: string) {
  const numeric = amountQuery(query);
  return transactions
    .filter((item) =>
      numeric
        ? amountMatches(item.amount, numeric)
        : textMatches(query, [item.merchant, item.category, item.source, item.note])
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function searchReceipts(receipts: Receipt[], query: string) {
  const numeric = amountQuery(query);
  return receipts
    .filter((item) =>
      numeric ? amountMatches(item.amount, numeric) : textMatches(query, [item.vendor, item.category, item.note])
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** What the matching transactions add up to this calendar year, for the summary card. */
export function yearTotals(matches: Transaction[], now = new Date()) {
  const year = now.getFullYear();
  return matches.reduce(
    (totals, item) => {
      if (new Date(item.date).getFullYear() !== year) {
        return totals;
      }
      const value = Math.abs(item.amount);
      if (item.kind === 'income') {
        totals.earned += value;
      } else {
        totals.spent += value;
      }
      totals.count += 1;
      return totals;
    },
    { spent: 0, earned: 0, count: 0 }
  );
}

/** The categories people use most, offered as one-tap searches before they type. */
export function topCategories(transactions: Transaction[], limit = 6) {
  const counts = new Map<string, number>();
  for (const item of transactions) {
    const category = item.category?.trim();
    if (category) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category]) => category);
}
