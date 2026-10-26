/**
 * Turns a bank alert (an SMS, a bank app's notification, or pasted text) into money in or out.
 * Pure functions with no app imports, so they can be checked on their own.
 */

export type AlertKind = 'income' | 'expense';

export type RawAlert = {
  /** Stable id from the phone, or made up for pasted text. */
  id: string;
  /** Who posted it: the bank app's name ("OPay") or the SMS sender ("GTBank"). */
  sender: string;
  title: string;
  text: string;
  /** When the phone received it, in milliseconds. */
  postedAt: number;
};

export type ParsedAlert = {
  id: string;
  kind: AlertKind;
  /** False when a bank's alert gave an amount but no clear in/out word; the person picks. */
  kindSure: boolean;
  amount: number;
  bank: string;
  /** Who it was from or to, when the alert says. */
  counterparty: string | null;
  balance: number | null;
  /** ISO time the money moved (the alert's time). */
  at: string;
  /** The original wording, kept so the person can see what Lancer read. */
  text: string;
};

const CURRENCY = String.raw`(?:₦|NGN|N(?=\s?\d)|\$|USD|US\$|GH₵|GHS|KES|KSh|£|GBP|€|EUR|ZAR|R(?=\s?\d))`;
const NUMBER = String.raw`(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)`;
const AMOUNT = new RegExp(`${CURRENCY}\\s?${NUMBER}`, 'gi');
const LABELLED_AMOUNT = new RegExp(`\\b(?:amt|amount)\\s*[:\\-]?\\s*(?:${CURRENCY})?\\s?${NUMBER}`, 'i');
const BALANCE = new RegExp(`\\b(?:avail(?:able)?\\.?\\s*)?bal(?:ance)?\\.?\\s*(?:is|:|-)?\\s*(?:${CURRENCY})?\\s?${NUMBER}`, 'i');

const CREDIT = /\b(credit(?:ed)?|cr|received|receive|inflow|deposit(?:ed)?|incoming|reversal|reversed|refund(?:ed)?|sent you|paid you|transferred to you|money in|cash ?in|top[- ]?up|funded|added to your)\b/i;
const DEBIT =
  /\b(debit(?:ed)?|dr|sent|send|transfer(?:red)?|withdraw(?:al|n)?|outflow|purchase|bought|paid|payment|spent|charged|deducted|pos|atm|airtime|recharge|data bundle|bill|money out|cash ?out)\b/i;

/** Marketing, loans and codes mention money but aren't money moving. */
const NOISE =
  /\b(otp|one[- ]time|verification code|token is|loan offer|borrow|get up to|up to ₦|win|stand a chance|promo|bonus offer|eligible|apply now|limit increase)\b/i;

/** Chat and social apps never count, even if someone types an amount. */
export const IGNORED_SENDERS = /whatsapp|telegram|messenger|instagram|facebook|snapchat|tiktok|signal|discord|slack|x\.com|twitter/i;

function toNumber(value: string) {
  return Number(value.replace(/,/g, ''));
}

function firstIndex(pattern: RegExp, text: string) {
  const match = pattern.exec(text);
  return match ? match.index : -1;
}

/** In or out. Explicit "credit"/"debit" wins; otherwise whichever word appears first. */
function detectKind(text: string): AlertKind | null {
  const explicitCredit = firstIndex(/\b(credit(?:ed)?|cr)\b/i, text);
  const explicitDebit = firstIndex(/\b(debit(?:ed)?|dr)\b/i, text);
  if (explicitCredit >= 0 || explicitDebit >= 0) {
    if (explicitDebit < 0) return 'income';
    if (explicitCredit < 0) return 'expense';
    return explicitCredit < explicitDebit ? 'income' : 'expense';
  }

  const credit = firstIndex(CREDIT, text);
  const debit = firstIndex(DEBIT, text);
  if (credit < 0 && debit < 0) return null;
  if (debit < 0) return 'income';
  if (credit < 0) return 'expense';
  return credit <= debit ? 'income' : 'expense';
}

/** The money that moved: a labelled amount, else the first currency amount that isn't the balance. */
function detectAmount(text: string): number | null {
  const labelled = LABELLED_AMOUNT.exec(text);
  if (labelled) {
    return toNumber(labelled[1]);
  }

  AMOUNT.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = AMOUNT.exec(text))) {
    const before = text.slice(Math.max(0, match.index - 16), match.index);
    if (/bal(?:ance)?\.?\s*(?:is|:|-)?\s*$/i.test(before)) {
      continue;
    }
    return toNumber(match[1]);
  }
  return null;
}

function clean(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[\s:,.-]+|[\s:,.-]+$/g, '')
    .trim();
}

/** "from JOHN DOE", "to Jane", "Desc: ...", "Narration: ...". */
function detectCounterparty(text: string, kind: AlertKind): string | null {
  const labelled = /\b(?:desc(?:ription)?|des|narration|remarks?|details?)\s*[:\-]\s*(.+?)(?=\s*(?:\bavail|\bavl|\bbal|\bdate|\btime\b|\bamt|\bamount|\bref|\n|$))/i.exec(text);
  const direction = kind === 'income' ? '(?:from|by)' : 'to';
  const named = new RegExp(
    `\\b${direction}\\s+([A-Za-z0-9][A-Za-z0-9 .'&/-]{1,48}?)(?=\\s*(?:\\bon\\b|\\bat\\b|\\bvia\\b|\\bbal|\\bavail|\\bdate|\\bwith\\b|\\bref|\\bhas\\b|\\bwas\\b|\\bis\\b|\\bsuccess|[.,;|\\n]|$))`,
    'i'
  ).exec(text);

  const pick = named?.[1] ?? labelled?.[1];
  if (!pick) {
    return null;
  }
  const value = clean(pick);
  // "to your account" / "from your wallet" say nothing about who.
  if (!value || /^(your|you|the|a|an)\b/i.test(value) || /^\d+$/.test(value)) {
    return labelled?.[1] && pick !== labelled[1] ? clean(labelled[1]) || null : null;
  }
  return value;
}

const KNOWN_BANKS: [RegExp, string][] = [
  [/opay/i, 'OPay'],
  [/kuda/i, 'Kuda'],
  [/palm\s?pay/i, 'PalmPay'],
  [/moniepoint/i, 'Moniepoint'],
  [/gt\s?bank|gtworld|gtco|guaranty/i, 'GTBank'],
  [/zenith/i, 'Zenith Bank'],
  [/access/i, 'Access Bank'],
  [/first\s?bank|fbn/i, 'First Bank'],
  [/\buba\b|united bank for africa/i, 'UBA'],
  [/fidelity/i, 'Fidelity Bank'],
  [/fcmb/i, 'FCMB'],
  [/sterling/i, 'Sterling Bank'],
  [/union\s?bank/i, 'Union Bank'],
  [/wema|alat/i, 'Wema Bank'],
  [/polaris/i, 'Polaris Bank'],
  [/ecobank/i, 'Ecobank'],
  [/stanbic/i, 'Stanbic IBTC'],
  [/keystone/i, 'Keystone Bank'],
  [/providus/i, 'Providus Bank'],
  [/carbon/i, 'Carbon'],
  [/fair\s?money/i, 'FairMoney'],
  [/chipper/i, 'Chipper Cash'],
  [/m-?pesa/i, 'M-Pesa'],
];

export function isKnownBank(sender: string) {
  return /\bbank\b|\bmfb\b|wallet|\bpay\b/i.test(sender) || KNOWN_BANKS.some(([pattern]) => pattern.test(sender));
}

/** "ZENITHBANK", "GTWorld" and "GTBank" all become one tidy bank name. */
export function normalizeBank(sender: string) {
  const known = KNOWN_BANKS.find(([pattern]) => pattern.test(sender));
  if (known) {
    return known[1];
  }
  const value = clean(sender);
  return value || 'Bank alert';
}

export function parseAlert(raw: RawAlert): ParsedAlert | null {
  if (IGNORED_SENDERS.test(raw.sender)) {
    return null;
  }

  const text = clean(`${raw.title} ${raw.text}`);
  // Banks tack promos onto real alerts ("…successful. Win big with OPay!"), so an advert word only
  // rules an alert out when nothing in it says money came in or went out.
  const detected = detectKind(text);
  if (NOISE.test(text) && !detected) {
    return null;
  }

  const amount = detectAmount(text);
  if (!amount || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  // An amount from a bank or money app counts even when its wording is new to us; the person says which way.
  if (!detected && !isKnownBank(`${raw.sender} ${raw.title}`)) {
    return null;
  }
  const kind = detected ?? 'expense';

  const balance = BALANCE.exec(text);
  return {
    id: raw.id,
    kind,
    kindSure: detected !== null,
    amount,
    bank: normalizeBank(raw.sender || raw.title),
    counterparty: detectCounterparty(text, kind),
    balance: balance ? toNumber(balance[1]) : null,
    at: new Date(raw.postedAt).toISOString(),
    text: raw.text || raw.title,
  };
}

/** Banks often send an SMS and an app notification for the same money: keep one. */
export function isSameMovement(a: ParsedAlert, b: ParsedAlert) {
  return (
    a.kind === b.kind &&
    Math.abs(a.amount - b.amount) < 0.005 &&
    Math.abs(new Date(a.at).getTime() - new Date(b.at).getTime()) <= 3 * 60 * 1000
  );
}
