import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { CurrencyPicker } from '@/components/currency/currency-picker';
import { Screen } from '@/components/ds';
import { useLedger } from '@/providers/ledger-provider';

/** One job: change the currency every amount is shown in. Saves on tap. */
export default function CurrencyScreen() {
  const router = useRouter();
  const { actions, profile } = useLedger();
  const [value, setValue] = useState(profile.currency);

  const choose = async (code: string) => {
    const previous = value;
    setValue(code);
    try {
      await actions.updateProfile({
        currency: code,
        homeState: profile.homeState,
        name: profile.name,
        role: profile.role,
      });
      router.back();
    } catch (error) {
      setValue(previous);
      Alert.alert('Currency not saved', error instanceof Error ? error.message : 'Try again in a moment.');
    }
  };

  return (
    <Screen header>
      <CurrencyPicker onChange={(code) => void choose(code)} value={value} />
    </Screen>
  );
}
