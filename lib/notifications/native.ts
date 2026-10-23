import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { MileageMode, QuarterEstimate } from '@/types/ledger';

const REMINDER_CHANNEL = 'ledgerpilot-reminders';
const PREFS_KEY = '@lancer/reminder-prefs';
const ASKED_KEY = '@lancer/reminders-asked';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** The reminder types people can switch on and off. */
export type ReminderKind = 'quarterlyTax' | 'weeklyCheckIn' | 'mileage' | 'yearEnd';
export type ReminderPrefs = Record<ReminderKind, boolean>;

export const reminderLabels: Record<ReminderKind, { title: string; subtitle: string }> = {
  quarterlyTax: { title: 'Tax deadlines', subtitle: 'A week before and the day before' },
  weeklyCheckIn: { title: 'Weekly check-in', subtitle: 'Sundays, only if something needs you' },
  mileage: { title: 'Mileage', subtitle: 'Fridays, if you drive for work' },
  yearEnd: { title: 'Year-end packet', subtitle: 'Each January' },
};

const defaultPrefs: ReminderPrefs = { quarterlyTax: true, weeklyCheckIn: true, mileage: true, yearEnd: true };

/** Where a tapped reminder takes people. */
export type ReminderRoute = '/tax' | '/activity' | '/mileage' | '/report-packet';

export type PermissionState = 'granted' | 'undetermined' | 'blocked' | 'unsupported';

export async function loadReminderPrefs(): Promise<ReminderPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw ? { ...defaultPrefs, ...(JSON.parse(raw) as Partial<ReminderPrefs>) } : defaultPrefs;
  } catch {
    return defaultPrefs;
  }
}

export async function saveReminderPrefs(prefs: ReminderPrefs) {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  await resyncReminders();
}

export async function readPermission(): Promise<PermissionState> {
  if (Platform.OS === 'web') {
    return 'unsupported';
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }
  return current.canAskAgain ? 'undetermined' : 'blocked';
}

/** Shows the system prompt. Only call from a clear user action. */
export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  await ensureChannelAsync();
  const requested = await Notifications.requestPermissionsAsync();
  const granted =
    requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (granted) {
    await resyncReminders();
  }
  return granted;
}

/** Whether to offer the after-setup prompt: only once, and only if the phone hasn't decided yet. */
export async function shouldOfferReminders() {
  try {
    const [asked, permission] = await Promise.all([AsyncStorage.getItem(ASKED_KEY), readPermission()]);
    return !asked && permission === 'undetermined';
  } catch {
    return false;
  }
}

export async function markRemindersOffered() {
  await AsyncStorage.setItem(ASKED_KEY, '1');
}

async function ensureChannelAsync() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
    name: 'Lancer reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

function at(date: Date, hour: number, minute = 0) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

/** The next given weekday (0 = Sunday) at a set time, always in the future. */
function nextWeekday(weekday: number, hour: number) {
  const now = new Date();
  const target = at(now, hour);
  target.setDate(now.getDate() + ((weekday - now.getDay() + 7) % 7));
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 7);
  }
  return target;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

async function schedule(title: string, body: string, when: Date, route: ReminderRoute) {
  if (when.getTime() <= Date.now()) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { route }, sound: false },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: REMINDER_CHANNEL },
  });
}

export type ReminderInputs = {
  mileageMode: MileageMode;
  quarters: QuarterEstimate[];
  transactionsToReview: number;
  receiptsToReview: number;
  hasRecentTrip: boolean;
  hasTransactions: boolean;
};

let lastInputs: ReminderInputs | null = null;

/**
 * Replaces every scheduled reminder with a fresh set built from the latest data. Runs whenever
 * the data changes, so counts in the messages stay current. Never asks for permission itself.
 */
export async function syncLocalReminders(inputs: ReminderInputs) {
  lastInputs = inputs;

  if ((await readPermission()) !== 'granted') {
    return;
  }

  const prefs = await loadReminderPrefs();
  await Notifications.cancelAllScheduledNotificationsAsync();
  await ensureChannelAsync();

  if (prefs.quarterlyTax) {
    for (const quarter of inputs.quarters) {
      if (quarter.status === 'Complete' || quarter.amountDue <= 0) {
        continue;
      }
      const due = new Date(quarter.dueDate);
      const amount = money(quarter.amountDue);
      const weekBefore = at(new Date(due.getTime() - 7 * 86400000), 9);
      const dayBefore = at(new Date(due.getTime() - 86400000), 9);
      await schedule(`${quarter.label} tax due in a week`, `Estimated ${amount}. Pay it before the deadline.`, weekBefore, '/tax');
      await schedule(`${quarter.label} tax due tomorrow`, `Estimated ${amount}. Last day to pay without a penalty.`, dayBefore, '/tax');
    }
  }

  if (prefs.weeklyCheckIn) {
    const parts = [
      inputs.transactionsToReview > 0
        ? `${inputs.transactionsToReview} ${inputs.transactionsToReview === 1 ? 'transaction needs' : 'transactions need'} a category`
        : null,
      inputs.receiptsToReview > 0
        ? `${inputs.receiptsToReview} ${inputs.receiptsToReview === 1 ? 'receipt' : 'receipts'} to review`
        : null,
    ].filter(Boolean);
    if (parts.length > 0) {
      await schedule('Weekly check-in', `${parts.join(' · ')}.`, nextWeekday(0, 18), '/activity');
    }
  }

  if (prefs.mileage && inputs.mileageMode !== 'Never' && !inputs.hasRecentTrip) {
    await schedule('Log this week’s work drives', 'Every business mile lowers your tax bill.', nextWeekday(5, 17), '/mileage');
  }

  if (prefs.yearEnd && inputs.hasTransactions) {
    const now = new Date();
    const january = new Date(now.getFullYear() + 1, 0, 10, 10, 0, 0);
    await schedule(
      `Your ${now.getFullYear()} packet is ready`,
      'Send your accountant one file with income, deductions and mileage.',
      january,
      '/report-packet'
    );
  }
}

/** Re-runs the last schedule, e.g. after a toggle changes or permission is granted. */
export async function resyncReminders() {
  if (lastInputs) {
    await syncLocalReminders(lastInputs);
  }
}
