import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Chip, Field, HeaderButton, List, Row, Screen, Segmented, Text } from '@/components/ds';
import { categoryOptionsFor, parseAmount } from '@/components/money/money-utils';
import { choosePhotoSource, pickReceiptImage } from '@/components/money/receipt-capture';
import { radius, space, tabularNums } from '@/constants/theme';
import { currencySymbol } from '@/lib/currencies';
import { getDisplayCurrency } from '@/lib/formatters';
import { useMyBanks } from '@/lib/my-banks';
import { bankOf, listBanks, OTHER_BANK } from '@/lib/summary';
import { ReceiptCaptureAsset, removeUploadedReceiptAsset, uploadReceiptAsset } from '@/lib/supabase/receipts';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';
import { TransactionKind } from '@/types/ledger';

const kinds = ['expense', 'income'] as const;
const kindLabels = { expense: 'Money out', income: 'Money in' } as const;
const manualSource = 'Manual entry';
const NEW_BANK = '+ New bank';

/** One job: log a transaction in a few taps. */
export default function TransactionCreateScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { actions, transactions, usingLiveBackend } = useLedger();

  const [kind, setKind] = useState<TransactionKind>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState(() => categoryOptionsFor('expense', transactions)[0] ?? 'Misc');
  // Banks already used, plus the ones picked during setup.
  const myBanks = useMyBanks();
  const banks = useMemo(
    () => [...new Set([...listBanks(transactions), ...myBanks])].sort((a, b) => a.localeCompare(b)),
    [myBanks, transactions]
  );
  // Start on the bank used most recently: people juggling several banks usually log a run from one.
  const [bank, setBank] = useState(() => {
    const latest = [...transactions].sort((a, b) => b.date.localeCompare(a.date))[0];
    return latest ? bankOf(latest) : banks.length === 0 ? NEW_BANK : banks[0];
  });
  const [newBank, setNewBank] = useState('');
  const [note, setNote] = useState('');
  const [receiptAsset, setReceiptAsset] = useState<ReceiptCaptureAsset | null>(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; merchant?: string; bank?: string }>({});

  const categories = useMemo(() => categoryOptionsFor(kind, transactions), [kind, transactions]);
  const bankOptions = [...banks, OTHER_BANK, NEW_BANK];

  const changeKind = (next: TransactionKind) => {
    setKind(next);
    setCategory(categoryOptionsFor(next, transactions)[0] ?? (next === 'income' ? 'Income' : 'Misc'));
    if (next === 'income') {
      setReceiptAsset(null);
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

  const close = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/activity');
    }
  };

  const save = async () => {
    const parsed = parseAmount(amount);
    const nextErrors = {
      amount: Number.isNaN(parsed) ? 'Enter an amount above zero.' : undefined,
      merchant: merchant.trim() ? undefined : kind === 'income' ? 'Add who paid you.' : 'Add where you spent it.',
      bank: bank === NEW_BANK && !newBank.trim() ? 'Name the bank, e.g. GTBank or Opay.' : undefined,
    };
    setErrors(nextErrors);

    if (nextErrors.amount || nextErrors.merchant || nextErrors.bank || !category) {
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
        deductible: false,
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
        source: bank === NEW_BANK ? newBank.trim() : bank === OTHER_BANK ? manualSource : bank,
      });

      close();
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
    <Screen header>
      {/* Cancel and Save live in the header so the keyboard can never hide them. */}
      <Stack.Screen
        options={{
          headerLeft: () => <HeaderButton label="Cancel" onPress={close} />,
          headerRight: () => <HeaderButton label="Save" loading={saving} onPress={() => void save()} primary />,
        }}
      />
      <Segmented labels={kindLabels} onChange={changeKind} options={kinds} value={kind} />

      <Field
        autoFocus
        error={errors.amount}
        keyboardType="decimal-pad"
        label="Amount"
        onChangeText={setAmount}
        placeholder="0.00"
        prefix={currencySymbol(getDisplayCurrency())}
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

      <View style={styles.group}>
        <Text tone="muted" variant="smallMedium">
          Bank
        </Text>
        <View style={styles.chips}>
          {bankOptions.map((option) => (
            <Chip key={option} label={option} onPress={() => setBank(option)} selected={bank === option} />
          ))}
        </View>
        {bank === NEW_BANK ? (
          <Field
            autoCapitalize="words"
            error={errors.bank}
            label="Bank name"
            onChangeText={setNewBank}
            placeholder="GTBank, Opay, Chase…"
            value={newBank}
          />
        ) : null}
      </View>

      {kind === 'expense' ? (
        <List>
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
        placeholder="Optional"
        style={styles.note}
        textAlignVertical="top"
        value={note}
      />

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
