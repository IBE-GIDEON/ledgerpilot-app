import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Chip, Field, List, Row, Screen, Segmented, Text } from '@/components/ds';
import { categoryOptionsFor, internalSources, parseAmount } from '@/components/money/money-utils';
import { choosePhotoSource, pickReceiptImage } from '@/components/money/receipt-capture';
import { SwitchRow } from '@/components/money/switch-row';
import { radius, space, tabularNums } from '@/constants/theme';
import { ReceiptCaptureAsset, removeUploadedReceiptAsset, uploadReceiptAsset } from '@/lib/supabase/receipts';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';
import { TransactionKind } from '@/types/ledger';

const kinds = ['expense', 'income'] as const;
const kindLabels = { expense: 'Expense', income: 'Income' } as const;
const manualSource = 'Manual entry';

/** One job: log a transaction in a few taps. */
export default function TransactionCreateScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { accounts, actions, transactions, usingLiveBackend } = useLedger();

  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState(() => categoryOptionsFor('expense', transactions)[0] ?? 'Misc');
  const [source, setSource] = useState(manualSource);
  const [note, setNote] = useState('');
  const [deductible, setDeductible] = useState(true);
  const [receiptAsset, setReceiptAsset] = useState<ReceiptCaptureAsset | null>(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; merchant?: string }>({});

  const categories = useMemo(() => categoryOptionsFor(kind, transactions), [kind, transactions]);
  const sources = useMemo(
    () => [manualSource, ...accounts.filter((account) => !internalSources.includes(account))],
    [accounts],
  );

  const changeKind = (next: TransactionKind) => {
    setKind(next);
    setCategory(categoryOptionsFor(next, transactions)[0] ?? (next === 'income' ? 'Income' : 'Misc'));
    if (next === 'income') {
      setDeductible(false);
      setReceiptAsset(null);
    } else {
      setDeductible(true);
    }
  };

  const attachPhoto = () => {
    choosePhotoSource((from) => {
      setCaptureBusy(true);
      void pickReceiptImage(from)
        .then((asset) => {
          if (asset) {
            setReceiptAsset(asset);
          }
        })
        .finally(() => setCaptureBusy(false));
    });
  };

  const openAttachedReceipt = () => {
    Alert.alert('Receipt', undefined, [
      { text: 'Replace photo', onPress: attachPhoto },
      { text: 'Remove', style: 'destructive', onPress: () => setReceiptAsset(null) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const save = async () => {
    const parsed = parseAmount(amount);
    const nextErrors = {
      amount: Number.isNaN(parsed) ? 'Enter an amount above zero.' : undefined,
      merchant: merchant.trim() ? undefined : kind === 'income' ? 'Add who paid you.' : 'Add where you spent it.',
    };
    setErrors(nextErrors);

    if (nextErrors.amount || nextErrors.merchant || !category) {
      return;
    }

    let storagePath: string | null = null;

    try {
      setSaving(true);

      if (kind === 'expense' && receiptAsset && usingLiveBackend) {
        storagePath = await uploadReceiptAsset(receiptAsset);
      }

      await actions.addTransaction({
        amount: parsed,
        category,
        deductible: kind === 'expense' ? deductible : false,
        kind,
        merchant: merchant.trim(),
        note: note.trim() || (kind === 'income' ? 'Manual income entry' : 'Manual expense entry'),
        receipt:
          kind === 'expense' && receiptAsset
            ? {
                amount: parsed,
                category,
                note: note.trim() || 'Attached while logging a manual expense',
                storagePath,
                vendor: merchant.trim(),
              }
            : undefined,
        source,
      });

      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/activity');
      }
    } catch (error) {
      if (storagePath) {
        await removeUploadedReceiptAsset(storagePath);
      }

      Alert.alert('Not saved', error instanceof Error ? error.message : 'Unable to save that transaction right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen header keyboard footer={<Button label="Save" loading={saving} onPress={() => void save()} />}>
      <Segmented labels={kindLabels} onChange={changeKind} options={kinds} value={kind} />

      <Field
        autoFocus
        error={errors.amount}
        keyboardType="decimal-pad"
        label="Amount"
        onChangeText={setAmount}
        placeholder="0.00"
        prefix="$"
        style={[styles.amount, tabularNums]}
        value={amount}
      />

      <Field
        autoCapitalize="words"
        error={errors.merchant}
        label={kind === 'income' ? 'Client or payer' : 'Merchant'}
        onChangeText={setMerchant}
        placeholder={kind === 'income' ? 'Who paid you' : 'Where you spent it'}
        returnKeyType="next"
        value={merchant}
      />

      <View style={styles.group}>
        <Text tone="muted" variant="smallMedium">
          Category
        </Text>
        <View style={styles.chips}>
          {categories.map((option) => (
            <Chip key={option} label={option} onPress={() => setCategory(option)} selected={category === option} />
          ))}
        </View>
      </View>

      {kind === 'expense' ? (
        <List>
          <SwitchRow icon="pricetag-outline" onValueChange={setDeductible} title="Deductible" value={deductible} />
          {receiptAsset ? (
            <Row
              chevron
              icon="image-outline"
              iconTone="positive"
              onPress={openAttachedReceipt}
              title="Receipt attached"
              trailing={
                <Image
                  accessibilityLabel="Attached receipt photo"
                  contentFit="cover"
                  source={{ uri: receiptAsset.uri }}
                  style={[styles.thumb, { backgroundColor: theme.surfaceMuted }]}
                />
              }
            />
          ) : (
            <Row
              chevron
              icon="camera-outline"
              iconTone="primary"
              onPress={captureBusy ? undefined : attachPhoto}
              title="Attach receipt"
            />
          )}
        </List>
      ) : null}

      <Field
        autoCapitalize="sentences"
        label="Note"
        multiline
        onChangeText={setNote}
        placeholder="Business purpose"
        style={styles.note}
        textAlignVertical="top"
        value={note}
      />

      {sources.length > 1 ? (
        <View style={styles.group}>
          <Text tone="muted" variant="smallMedium">
            Account
          </Text>
          <View style={styles.chips}>
            {sources.map((option) => (
              <Chip key={option} label={option} onPress={() => setSource(option)} selected={source === option} />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: {
    fontSize: 22,
  },
  group: {
    gap: space.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  note: {
    minHeight: 88,
  },
  thumb: {
    borderRadius: radius.sm,
    height: 40,
    width: 30,
  },
});
