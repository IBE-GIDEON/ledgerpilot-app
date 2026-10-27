import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { CurrencyPicker } from '@/components/currency/currency-picker';
import { Button, Chip, Field, List, Progress, Row, Screen, Text } from '@/components/ds';
import { space, tabularNums } from '@/constants/theme';
import { deviceCurrency } from '@/lib/currencies';
import { saveMyBanks, suggestedBanks } from '@/lib/my-banks';
import { shouldOfferReminders } from '@/lib/notifications/native';
import { LancerAlerts } from '@/modules/lancer-alerts';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';

type StepKey = 'currency' | 'banks' | 'alerts';

const stepText: Record<StepKey, { title: string; body: string }> = {
  currency: {
    title: 'Which currency should Lancer show?',
    body: 'Every total is shown in it. Alerts in another currency are converted at today’s rate.',
  },
  banks: {
    title: 'Which banks and wallets do you use?',
    body: 'Pick all that apply. Lancer shows what comes in and goes out of each one.',
  },
  alerts: {
    title: 'Catch bank alerts for you?',
    body: 'When money moves, Lancer reads your bank’s alert and asks what it was for.',
  },
};

// Bank alerts are read on the phone itself, which only Android allows.
const steps: StepKey[] = LancerAlerts ? ['currency', 'banks', 'alerts'] : ['currency', 'banks'];

export default function SetupScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { actions, isAuthenticated, isHydratingAuth, onboardingComplete, profile } = useLedger();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // New profiles start on USD; suggest the phone's region currency instead.
  const [currency, setCurrency] = useState(
    profile.currency && profile.currency !== 'USD' ? profile.currency : deviceCurrency()
  );
  const [banks, setBanks] = useState<string[]>([]);
  const [otherBank, setOtherBank] = useState('');
  const [alertsOn, setAlertsOn] = useState(true);

  if (isHydratingAuth) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  // Billing never gates setup; plans and cards live under Account.
  if (onboardingComplete && !submitting) {
    return <Redirect href="/dashboard" />;
  }

  const step = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const suggestions = [...new Set([...suggestedBanks(currency), ...banks])];

  const toggleBank = (name: string) =>
    setBanks((current) => (current.includes(name) ? current.filter((bank) => bank !== name) : [...current, name]));

  const addOtherBank = () => {
    const name = otherBank.trim();
    if (name) {
      setBanks((current) => (current.includes(name) ? current : [...current, name]));
      setOtherBank('');
    }
  };

  const finish = async (turnOnAlerts: boolean) => {
    try {
      setSubmitting(true);
      // Decide before saving: the reminders prompt shows once, only if the phone hasn't decided yet.
      const offerReminders = await shouldOfferReminders();
      const typed = otherBank.trim();
      await saveMyBanks(typed ? [...banks, typed] : banks);
      await actions.completeOnboarding({
        currency,
        incomeStyle: profile.incomeStyle,
        mileageMode: profile.mileageMode,
        primaryFocus: profile.primaryFocus,
        role: profile.role,
      });
      if (turnOnAlerts) {
        // Home underneath, so Back from Bank alerts lands somewhere.
        router.replace('/dashboard');
        router.push('/bank-alerts');
        return;
      }
      router.replace(offerReminders ? '/reminders-intro' : '/dashboard');
    } catch (error) {
      setSubmitting(false);
      Alert.alert(
        'Setup not saved',
        error instanceof Error ? error.message : 'We couldn’t save your answers right now. Try again in a moment.'
      );
    }
  };

  const handleContinue = () => {
    if (isLastStep) {
      void finish(step === 'alerts' && alertsOn);
      return;
    }
    setStepIndex((current) => current + 1);
  };

  // Skipping keeps whatever was picked so far.
  const handleSkip = () => void finish(false);

  const choice = (value: boolean, title: string, detail: string, icon: 'flash-outline' | 'create-outline') => {
    const isSelected = alertsOn === value;
    return (
      <Row
        accessibilityLabel={`${title}. ${detail}${isSelected ? '. Selected' : ''}`}
        icon={icon}
        iconTone={isSelected ? 'primary' : 'default'}
        onPress={() => setAlertsOn(value)}
        subtitle={detail}
        title={title}
        trailing={
          <Ionicons
            color={isSelected ? theme.tint : theme.borderStrong}
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
          />
        }
      />
    );
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          {stepIndex > 0 ? (
            <Button
              disabled={submitting}
              label="Back"
              onPress={() => setStepIndex((current) => current - 1)}
              style={styles.back}
              variant="ghost"
            />
          ) : null}
          <Button
            label={isLastStep ? (step === 'alerts' && alertsOn ? 'Turn on' : 'Finish') : 'Continue'}
            loading={submitting}
            onPress={handleContinue}
            style={styles.continue}
          />
        </View>
      }>
      <View style={styles.top}>
        <View style={styles.topRow}>
          <Text tone="muted" variant="smallMedium" style={tabularNums}>
            {stepIndex + 1} of {steps.length}
          </Text>
          <Button
            disabled={submitting}
            fullWidth={false}
            label="Skip"
            onPress={handleSkip}
            size="small"
            variant="ghost"
          />
        </View>
        <Progress value={(stepIndex + 1) / steps.length} />
      </View>

      <View style={styles.heading}>
        <Text accessibilityRole="header" variant="title">
          {stepText[step].title}
        </Text>
        <Text tone="muted">{stepText[step].body}</Text>
      </View>

      {step === 'currency' ? <CurrencyPicker onChange={setCurrency} value={currency} /> : null}

      {step === 'banks' ? (
        <>
          <View style={styles.chips}>
            {suggestions.map((name) => (
              <Chip key={name} label={name} onPress={() => toggleBank(name)} selected={banks.includes(name)} />
            ))}
          </View>
          <Field
            autoCapitalize="words"
            label="Another bank or wallet"
            onChangeText={setOtherBank}
            onSubmitEditing={addOtherBank}
            placeholder="Type a name and press done"
            returnKeyType="done"
            value={otherBank}
          />
        </>
      ) : null}

      {step === 'alerts' ? (
        <List>
          {choice(true, 'Yes, catch them', 'From bank apps and bank SMS. You’ll allow it on the next screen.', 'flash-outline')}
          {choice(false, 'Not now', 'Add money in and out yourself. Turn it on later in Account.', 'create-outline')}
        </List>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    gap: space.sm,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heading: {
    gap: space.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: space.sm,
  },
  back: {
    flex: 1,
  },
  continue: {
    flex: 2,
  },
});
