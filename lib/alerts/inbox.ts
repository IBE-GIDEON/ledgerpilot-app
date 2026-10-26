import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { isSameMovement, normalizeBank, ParsedAlert, parseAlert, RawAlert } from '@/lib/alerts/parse';
import { LancerAlerts } from '@/modules/lancer-alerts';

/** Alerts caught but not yet answered. Nothing becomes a transaction until someone says what it was. */
export type PendingAlert = ParsedAlert & { answer?: string };

const INBOX_KEY = '@lancer/alert-inbox';
const RECENT_KEY = '@lancer/alert-recent';
const MAX_RECENT = 50;

let pending: PendingAlert[] = [];
// Saved movements from the last while, so a late SMS for money already logged isn't asked about twice.
let recent: ParsedAlert[] = [];
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

async function persist() {
  await AsyncStorage.multiSet([
    [INBOX_KEY, JSON.stringify(pending)],
    [RECENT_KEY, JSON.stringify(recent.slice(-MAX_RECENT))],
  ]);
}

export function loadInbox() {
  loaded ??= AsyncStorage.multiGet([INBOX_KEY, RECENT_KEY])
    .then(([[, inbox], [, saved]]) => {
      pending = inbox ? (JSON.parse(inbox) as PendingAlert[]) : [];
      recent = saved ? (JSON.parse(saved) as ParsedAlert[]) : [];
      emit();
    })
    .catch(() => undefined);
  return loaded;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAlertInbox() {
  return useSyncExternalStore(subscribe, () => pending);
}

/** Adds newly caught alerts, skipping anything already waiting or already saved. */
async function ingest(raws: RawAlert[], answers: Record<string, string>) {
  await loadInbox();
  let changed = false;

  for (const raw of raws) {
    const parsed = parseAlert(raw);
    if (!parsed) {
      LancerAlerts?.cancelPrompt(raw.id);
      continue;
    }

    const twin = pending.find((item) => isSameMovement(item, parsed));
    if (twin || recent.some((item) => isSameMovement(item, parsed))) {
      // Same money seen twice (SMS and app). Keep the first, carry over any answer, drop the extra prompt.
      if (twin && !twin.answer && answers[raw.id]) {
        twin.answer = answers[raw.id];
      }
      LancerAlerts?.cancelPrompt(raw.id);
      changed = true;
      continue;
    }

    pending.push({ ...parsed, answer: answers[raw.id] });
    changed = true;
  }

  // Answers typed into a notification after the app had already taken that alert.
  for (const item of pending) {
    if (!item.answer && answers[item.id]) {
      item.answer = answers[item.id];
      changed = true;
    }
  }

  if (changed) {
    pending = [...pending].sort((a, b) => a.at.localeCompare(b.at));
    await persist();
    emit();
  }
}

/** Pulls everything the Android listener caught since last time. */
export async function drainNativeAlerts() {
  if (!LancerAlerts) {
    await loadInbox();
    return;
  }
  try {
    const { alerts, answers } = JSON.parse(LancerAlerts.takePending()) as {
      alerts: RawAlert[];
      answers: Record<string, string>;
    };
    await ingest(alerts ?? [], answers ?? {});
  } catch {
    await loadInbox();
  }
}

/** A pasted or shared alert (iPhone Shortcuts, copy and paste). Returns null when it isn't money moving. */
export async function addAlertFromText(text: string, sender?: string, postedAt = Date.now()) {
  const id = `text-${Date.now()}`;
  const raw: RawAlert = {
    id,
    sender: sender?.trim() || normalizeBank(text),
    title: '',
    text: text.trim(),
    postedAt,
  };
  const parsed = parseAlert(raw);
  if (!parsed) {
    return null;
  }
  await ingest([raw], {});
  return parsed;
}

/** Removes an alert once it's saved (or marked as not a transaction) and clears its notification. */
export async function resolveAlert(id: string, saved: boolean) {
  await loadInbox();
  const item = pending.find((entry) => entry.id === id);
  pending = pending.filter((entry) => entry.id !== id);
  if (item && saved) {
    recent = [...recent, item].slice(-MAX_RECENT);
  }
  LancerAlerts?.cancelPrompt(id);
  await persist();
  emit();
}
