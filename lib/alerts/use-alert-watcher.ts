import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { drainNativeAlerts, resolveAlert, useAlertInbox } from '@/lib/alerts/inbox';
import { alertToTransaction } from '@/lib/alerts/save';
import { LancerAlerts } from '@/modules/lancer-alerts';
import { useLedger } from '@/providers/ledger-provider';

const ANSWER_ROUTE = '/alert-answer';

/**
 * Keeps bank alerts flowing while the app is usable (signed in, set up, intro done):
 * takes what the phone caught, saves anything already answered from the notification,
 * and puts the must-answer screen up for the rest.
 */
export function useAlertWatcher(ready: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const { actions } = useLedger();
  const pending = useAlertInbox();
  const saving = useRef(new Set<string>());

  useEffect(() => {
    if (!ready) {
      return;
    }

    LancerAlerts?.reconnect();
    void drainNativeAlerts();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void drainNativeAlerts();
      }
    });
    const caught = LancerAlerts?.addListener('onAlert', () => void drainNativeAlerts());

    return () => {
      appState.remove();
      caught?.remove();
    };
  }, [ready]);

  // Answered straight from the notification: save without asking again.
  useEffect(() => {
    if (!ready) {
      return;
    }
    for (const alert of pending) {
      if (!alert.answer || saving.current.has(alert.id)) {
        continue;
      }
      saving.current.add(alert.id);
      void alertToTransaction(alert, alert.answer)
        .then((transaction) => actions.addTransaction(transaction))
        .then(() => resolveAlert(alert.id, true))
        .catch(() => undefined)
        .finally(() => saving.current.delete(alert.id));
    }
  }, [actions, pending, ready]);

  const unanswered = pending.some((alert) => !alert.answer);
  useEffect(() => {
    if (ready && unanswered && pathname !== ANSWER_ROUTE) {
      router.push(ANSWER_ROUTE);
    }
  }, [pathname, ready, router, unanswered]);
}
