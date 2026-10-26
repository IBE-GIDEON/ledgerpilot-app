import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, StyleSheet, View } from 'react-native';

import { Amount, Button, Card, Chip, Field, Screen, Segmented, Text } from '@/components/ds';
import { categoryOptionsFor } from '@/components/money/money-utils';
import { space } from '@/constants/theme';
import { resolveAlert, useAlertInbox } from '@/lib/alerts/inbox';
import { alertToTransaction } from '@/lib/alerts/save';
import { formatDayTime } from '@/lib/formatters';
import { useLedger } from '@/providers/ledger-provider';
import { TransactionKind } from '@/types/ledger';

const kinds = ['income', 'expense'] as const;
const kindLabels = { income: 'Money in', expense: 'Money out' } as const;

/**
 * One job: say what a bank alert was for. There's no back or close: the only ways out are answering,
 * or saying it wasn't a transaction at all.
 */
export default function AlertAnswerScreen() {
  const router = useRouter();
  const { actions, transactions } = useLedger();
  const pending = useAlertInbox();
  const queue = pending.filter((alert) => !alert.answer);
  const alert = queue[0];

  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [kind, setKind] = useState<TransactionKind>(alert?.kind ?? 'expense');
  const [saving, setSaving] = useState(false);
  const [shownId, setShownId] = useState(alert?.id);

  // Fresh form for each alert in the queue.
  if (alert?.id !== shownId) {
    setShownId(alert?.id);
    setAnswer('');
    setCategory(null);
    setKind(alert?.kind ?? 'expense');
  }

  // Android's back button can't skip the question either.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    if (!alert) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/dashboard');
      }
    }
  }, [alert, router]);

  if (!alert) {
    return null;
  }

  // Older saved alerts have no kindSure; their direction was always read from the text.
  const unsure = alert.kindSure === false;
  const income = kind === 'income';
  const ready = answer.trim().length > 0;
  const categories = categoryOptionsFor(kind, transactions).slice(0, 10);

  const save = async () => {
    if (!ready) {
      return;
    }
    setSaving(true);
    try {
      await actions.addTransaction(alertToTransaction({ ...alert, kind }, answer, category ?? undefined));
      await resolveAlert(alert.id, true);
    } catch (error) {
      Alert.alert('Not saved', error instanceof Error ? error.message : 'Try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  const notMoney = () => {
    Alert.alert('Not a transaction?', 'Lancer will forget this alert.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Forget it', style: 'destructive', onPress: () => void resolveAlert(alert.id, false) },
    ]);
  };

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button disabled={!ready} label="Save" loading={saving} onPress={() => void save()} />
          <Button disabled={saving} label="Not a transaction" onPress={notMoney} size="small" variant="ghost" />
        </View>
      }>
      <View style={styles.top}>
        <Text tone="muted" variant="smallMedium">
          {queue.length > 1 ? `Bank alert · 1 of ${queue.length}` : 'Bank alert'}
        </Text>
        <Text accessibilityRole="header" variant="title">
          {unsure ? 'Money moved' : income ? 'Money came in' : 'Money went out'}
        </Text>
      </View>

      {unsure ? (
        <Segmented
          labels={kindLabels}
          onChange={(next) => {
            setKind(next);
            setCategory(null);
          }}
          options={kinds}
          value={kind}
        />
      ) : null}

      <Card tone="primary">
        <Amount cents signed size="display" tone="inverse" value={income ? alert.amount : -alert.amount} />
        <Text numberOfLines={1} tone="inverse" variant="bodyMedium">
          {alert.counterparty ? `${income ? 'From' : 'To'} ${alert.counterparty}` : alert.bank}
        </Text>
        <Text numberOfLines={1} tone="inverseMuted" variant="small">
          {`${alert.bank} · ${formatDayTime(alert.at)}`}
        </Text>
      </Card>

      <Field
        autoCapitalize="sentences"
        autoFocus
        label={income ? 'Who sent this, and what for?' : 'What was this for?'}
        onChangeText={setAnswer}
        onSubmitEditing={() => void save()}
        placeholder={income ? 'Client payment for logo design' : 'Fuel, rent, lunch with client…'}
        returnKeyType="done"
        value={answer}
      />

      <View style={styles.group}>
        <Text tone="muted" variant="smallMedium">
          Category
        </Text>
        <View style={styles.chips}>
          {categories.map((option) => (
            <Chip
              key={option}
              label={option}
              onPress={() => setCategory(category === option ? null : option)}
              selected={category === option}
            />
          ))}
        </View>
      </View>

      <Text numberOfLines={3} tone="faint" variant="caption">
        {alert.text}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    gap: space.xs,
  },
  actions: {
    gap: space.xs,
  },
  group: {
    gap: space.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
