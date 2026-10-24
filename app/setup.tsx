import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { ComponentProps, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { CurrencyPicker } from '@/components/currency/currency-picker';
import { Button, List, Progress, Row, Screen, Text } from '@/components/ds';
import { space, tabularNums } from '@/constants/theme';
import { deviceCurrency } from '@/lib/currencies';
import { shouldOfferReminders } from '@/lib/notifications/native';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';
import { IncomeStyle, MileageMode, SetupFocus } from '@/types/ledger';

type OnboardingAnswers = {
  currency: string;
  incomeStyle: IncomeStyle;
  mileageMode: MileageMode;
  primaryFocus: SetupFocus;
  role: string;
};

type IconName = ComponentProps<typeof Ionicons>['name'];

type Option = { value: string; icon: IconName; detail?: string };

type SetupStep = {
  key: keyof OnboardingAnswers;
  title: string;
  options: Option[];
};

const steps: SetupStep[] = [
  {
    key: 'role',
    title: 'What do you do?',
    options: [
      { value: 'Freelancer', icon: 'briefcase-outline' },
      { value: 'Creator', icon: 'videocam-outline' },
      { value: 'Consultant', icon: 'people-outline' },
      { value: 'Gig worker', icon: 'bicycle-outline' },
    ],
  },
  {
    // Rendered as a searchable list of every currency rather than option rows.
    key: 'currency',
    title: 'Your currency',
    options: [],
  },
  {
    key: 'incomeStyle',
    title: 'How are you paid?',
    options: [
      { value: 'Steady monthly', icon: 'calendar-outline', detail: 'Same each month' },
      { value: 'Mixed payouts', icon: 'shuffle-outline', detail: 'Uneven client timing' },
      { value: 'Variable weekly', icon: 'pulse-outline', detail: 'Changes weekly' },
      { value: 'Gig by gig', icon: 'flash-outline', detail: 'Paid per job' },
    ],
  },
  {
    key: 'primaryFocus',
    title: 'Start with?',
    options: [
      { value: 'Expenses & receipts', icon: 'receipt-outline' },
      { value: 'Mileage tracking', icon: 'car-outline' },
      { value: 'Quarterly tax', icon: 'calculator-outline' },
      { value: 'Everything in one place', icon: 'grid-outline' },
    ],
  },
  {
    key: 'mileageMode',
    title: 'Drive for work?',
    options: [
      { value: 'Often', icon: 'speedometer-outline', detail: 'Most working days' },
      { value: 'Sometimes', icon: 'car-outline', detail: 'A few times monthly' },
      { value: 'Rarely', icon: 'time-outline', detail: 'Now and then' },
      { value: 'Never', icon: 'close-circle-outline', detail: 'No mileage reminders' },
    ],
  },
];

export default function SetupScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { actions, isAuthenticated, isHydratingAuth, onboardingComplete, profile } = useLedger();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    // New profiles start on USD; suggest the phone's region currency instead.
    currency: profile.currency && profile.currency !== 'USD' ? profile.currency : deviceCurrency(),
    role: profile.role,
    incomeStyle: profile.incomeStyle,
    primaryFocus: profile.primaryFocus,
    mileageMode: profile.mileageMode,
  });

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
  const selected = answers[step.key];
  const isLastStep = stepIndex === steps.length - 1;

  const finish = async (payload: OnboardingAnswers) => {
    try {
      setSubmitting(true);
      // Decide before saving: the reminders prompt shows once, only if the phone hasn't decided yet.
      const offerReminders = await shouldOfferReminders();
      await actions.completeOnboarding(payload);
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
      void finish(answers);
      return;
    }
    setStepIndex((current) => current + 1);
  };

  // Skipping keeps whatever was picked so far; untouched questions keep the profile defaults.
  const handleSkip = () => void finish(answers);

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
            label={isLastStep ? 'Finish' : 'Continue'}
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

      <Text accessibilityRole="header" variant="title">
        {step.title}
      </Text>

      {step.key === 'currency' ? (
        <CurrencyPicker
          onChange={(code) => setAnswers((current) => ({ ...current, currency: code }))}
          value={answers.currency}
        />
      ) : (
        <List>
          {step.options.map((option) => {
            const isSelected = selected === option.value;
            return (
              <Row
                key={option.value}
                accessibilityLabel={`${option.value}${option.detail ? `. ${option.detail}` : ''}${isSelected ? '. Selected' : ''}`}
                onPress={() => setAnswers((current) => ({ ...current, [step.key]: option.value }))}
                icon={option.icon}
                iconTone={isSelected ? 'primary' : 'default'}
                subtitle={option.detail}
                title={option.value}
                trailing={
                  <Ionicons
                    color={isSelected ? theme.tint : theme.borderStrong}
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                  />
                }
              />
            );
          })}
        </List>
      )}
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
