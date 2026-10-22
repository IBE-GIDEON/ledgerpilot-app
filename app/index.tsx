import { Redirect } from 'expo-router';

import { useLedger } from '@/providers/ledger-provider';

export default function IndexRoute() {
  const { isAuthenticated, isHydratingAuth, onboardingComplete } = useLedger();

  if (isHydratingAuth) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  // Billing and trial status gate individual Pro features, never the whole app.
  if (!onboardingComplete) {
    return <Redirect href="/setup" />;
  }

  return <Redirect href="/dashboard" />;
}
