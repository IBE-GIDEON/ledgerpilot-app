import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Exchange rates for turning an alert's money (naira, say) into the currency the person shows amounts in.
 * Rates come from ExchangeRate-API's free daily feed and are kept on the phone, so a rate is still there offline.
 */

const SOURCE = 'https://open.er-api.com/v6/latest/';
const CACHE_PREFIX = '@lancer/fx/';
const FRESH_FOR_MS = 12 * 60 * 60 * 1000;

export const RATES_CREDIT = 'Rates by exchangerate-api.com';

type Table = { fetchedAt: number; updatedAt: string; rates: Record<string, number> };

const memory = new Map<string, Table>();

async function readCache(base: string): Promise<Table | null> {
  const held = memory.get(base);
  if (held) return held;
  try {
    const saved = await AsyncStorage.getItem(CACHE_PREFIX + base);
    const table = saved ? (JSON.parse(saved) as Table) : null;
    if (table) memory.set(base, table);
    return table;
  } catch {
    return null;
  }
}

async function fetchTable(base: string): Promise<Table | null> {
  try {
    const response = await fetch(SOURCE + encodeURIComponent(base));
    if (!response.ok) return null;
    const body = (await response.json()) as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
    if (body.result !== 'success' || !body.rates) return null;
    const table: Table = { fetchedAt: Date.now(), updatedAt: body.time_last_update_utc ?? '', rates: body.rates };
    memory.set(base, table);
    await AsyncStorage.setItem(CACHE_PREFIX + base, JSON.stringify(table)).catch(() => undefined);
    return table;
  } catch {
    return null;
  }
}

/** How many `to` one `from` buys, or null when there's no rate at all (offline and never fetched). */
export async function getRate(from: string, to: string): Promise<number | null> {
  const base = from.toUpperCase();
  const target = to.toUpperCase();
  if (base === target) return 1;

  const cached = await readCache(base);
  const table = cached && Date.now() - cached.fetchedAt < FRESH_FOR_MS ? cached : ((await fetchTable(base)) ?? cached);
  const rate = table?.rates[target];
  return typeof rate === 'number' && rate > 0 ? rate : null;
}

export type Converted = {
  amount: number;
  /** Set when the money was converted: what the alert said, and the rate used. */
  original: { amount: number; currency: string; rate: number } | null;
  /** The alert's currency differs but no rate could be found, so the amount is as the alert said. */
  unconverted: boolean;
};

/** An amount in a given currency, whatever the person shows amounts in ("₦5,000", "$1.00"). */
export function formatIn(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** An amount in `from` shown in `to`, rounded to cents. */
export async function convert(amount: number, from: string | null | undefined, to: string): Promise<Converted> {
  if (!from || from.toUpperCase() === to.toUpperCase()) {
    return { amount, original: null, unconverted: false };
  }
  const rate = await getRate(from, to);
  if (rate === null) {
    return { amount, original: null, unconverted: true };
  }
  return {
    amount: Math.round(amount * rate * 100) / 100,
    original: { amount, currency: from.toUpperCase(), rate },
    unconverted: false,
  };
}
