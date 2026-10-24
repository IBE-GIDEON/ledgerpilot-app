let displayCurrency = 'USD';

/** Sets the currency every amount is shown in (the signed-in person's choice). Invalid codes fall back to USD. */
export function setDisplayCurrency(code: string | null | undefined) {
  const next = (code ?? '').toUpperCase();
  try {
    new Intl.NumberFormat('en-US', { style: 'currency', currency: next });
    displayCurrency = next;
  } catch {
    displayCurrency = 'USD';
  }
}

export function getDisplayCurrency() {
  return displayCurrency;
}

/** How many decimals the currency itself uses: 2 for most, 0 for yen, 3 for dinar. */
function currencyDecimals() {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency }).resolvedOptions()
    .maximumFractionDigits ?? 2;
}

export function formatCurrency(amount: number, fractionDigits?: number): string {
  const wanted = fractionDigits ?? (amount % 1 === 0 ? 0 : 2);
  // Never show more decimals than the currency has (no "¥1,200.00").
  const digits = Math.min(wanted, currencyDecimals());

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: displayCurrency,
    // "₦1,200" rather than "NGN 1,200".
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: displayCurrency,
    currencyDisplay: 'narrowSymbol',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(0)}%`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}
