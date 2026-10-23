import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import type { ReminderRoute } from '@/lib/notifications/native';

const routes: readonly ReminderRoute[] = ['/tax', '/activity', '/mileage', '/report-packet'];

/**
 * Opens the screen a reminder is about when it's tapped, whether the app was running or not.
 * Waits until `ready` (signed in, set up, intro finished) so the tap never lands on a screen
 * that would immediately redirect away.
 */
export function useReminderRouting(ready: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!ready) {
      return;
    }

    const open = (response: Notifications.NotificationResponse | null) => {
      const route = response?.notification.request.content.data?.route;
      if (typeof route === 'string' && (routes as readonly string[]).includes(route)) {
        router.push(route as ReminderRoute);
      }
    };

    // A tap that launched the app from closed is waiting here; handle it once.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      open(response);
      if (response) {
        void Notifications.clearLastNotificationResponseAsync();
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [ready, router]);
}
