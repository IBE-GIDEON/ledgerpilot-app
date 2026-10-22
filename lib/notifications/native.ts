import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { MileageMode } from '@/types/ledger';

const REMINDER_CHANNEL = 'ledgerpilot-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function tomorrowAt(hour: number, minute = 0) {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
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

export async function ensureNotificationPermissionsAsync() {
  if (Platform.OS === 'web') {
    return false;
  }

  await ensureChannelAsync();

  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (granted) {
    return true;
  }

  if (!current.canAskAgain) {
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

async function scheduleReminder(title: string, body: string, triggerDate: Date) {
  if (triggerDate.getTime() <= Date.now()) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { source: 'ledgerpilot-reminder' },
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function syncLocalReminders(params: {
  billingSetupComplete: boolean;
  hasRecentTrip: boolean;
  mileageMode: MileageMode;
  nextQuarterAmount?: number;
  nextQuarterDueDate?: string;
  receiptsToReview: number;
  trialEndsAt: string | null;
}) {
  if (!params.billingSetupComplete) {
    return;
  }

  const allowed = await ensureNotificationPermissionsAsync();

  if (!allowed) {
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
  await ensureChannelAsync();

  if (params.receiptsToReview > 0) {
    await scheduleReminder(
      'Review your receipts',
      `${params.receiptsToReview} receipt${
        params.receiptsToReview === 1 ? '' : 's'
      } still need a quick review in Lancer.`,
      tomorrowAt(18, 0)
    );
  }

  if (params.mileageMode !== 'Never' && !params.hasRecentTrip) {
    await scheduleReminder(
      'Did you drive for work today?',
      'Open Lancer and log or review any business drives so you do not miss mileage deductions.',
      tomorrowAt(19, 0)
    );
  }

  if (params.trialEndsAt) {
    const trialEndDate = new Date(params.trialEndsAt);
    const reminderDate = new Date(trialEndDate.getTime() - 2 * 24 * 60 * 60 * 1000);

    await scheduleReminder(
      'Your Lancer trial ends soon',
      'Review your saved plan before your free access window closes.',
      reminderDate.getTime() > Date.now() ? reminderDate : hoursFromNow(12)
    );
  }

  if (params.nextQuarterDueDate) {
    const dueDate = new Date(params.nextQuarterDueDate);
    const weekBefore = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    await scheduleReminder(
      'Quarterly tax deadline coming up',
      params.nextQuarterAmount
        ? `Keep ${Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          }).format(params.nextQuarterAmount)} ready before the next due date.`
        : 'Open Lancer to review what to set aside before the next due date.',
      weekBefore.getTime() > Date.now() ? weekBefore : hoursFromNow(24)
    );
  }
}
