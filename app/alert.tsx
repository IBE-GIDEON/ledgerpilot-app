import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { EmptyState, Screen } from '@/components/ds';
import { addAlertFromText } from '@/lib/alerts/inbox';
import { useLedger } from '@/providers/ledger-provider';

/**
 * lancer://alert?text=...&from=GTBank: where an iPhone Shortcuts automation hands over a bank text or
 * email. The alert joins the inbox and the must-answer screen takes it from there.
 */
export default function AlertLinkScreen() {
  const router = useRouter();
  const { text, from } = useLocalSearchParams<{ text?: string; from?: string }>();
  const { isAuthenticated, isHydratingAuth, onboardingComplete } = useLedger();
  const [unreadable, setUnreadable] = useState(false);

  useEffect(() => {
    if (isHydratingAuth || !isAuthenticated || !onboardingComplete) {
      return;
    }
    void addAlertFromText(text ?? '', from).then((parsed) => {
      if (parsed) {
        router.replace('/alert-answer');
      } else {
        setUnreadable(true);
      }
    });
  }, [from, isAuthenticated, isHydratingAuth, onboardingComplete, router, text]);

  if (isHydratingAuth) {
    return null;
  }
  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  return (
    <Screen>
      {unreadable ? (
        <EmptyState
          action={{ label: 'Go home', onPress: () => router.replace('/dashboard') }}
          body="That message didn't look like money coming in or going out."
          icon="help-circle-outline"
          title="Couldn't read that alert"
        />
      ) : null}
    </Screen>
  );
}
