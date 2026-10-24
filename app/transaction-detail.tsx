import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  Amount,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  List,
  Row,
  Screen,
  Section,
  Segmented,
  Text,
} from '@/components/ds';
import { categoryOptionsFor, parseAmount } from '@/components/money/money-utils';
import { chooseCaptureSource, pickReceiptImage } from '@/components/money/receipt-capture';
import { ReceiptComposer, ReceiptRequest } from '@/components/money/receipt-composer';
import { SwitchRow } from '@/components/ds/switch-row';
import { space, tabularNums } from '@/constants/theme';
import { currencySymbol } from '@/lib/currencies';
import { formatFullDate, getDisplayCurrency } from '@/lib/formatters';
import { UpdateTransactionPayload } from '@/lib/backend/payloads';
import { useLedger } from '@/providers/ledger-provider';
import { Transaction, TransactionKind } from '@/types/ledger';

const kinds = ['expense', 'income'] as const;
const kindLabels = { expense: 'Expense', income: 'Income' } as const;

/** One job: check or fix one transaction. Editing merchant, amount and type sits behind Edit. */
export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { actions, receipts, transactions } = useLedger();

  const transaction = transactions.find((item) => item.id === id);
  const receipt = transaction?.receiptId ? receipts.find((item) => item.id === transaction.receiptId) : undefined;

  const [note, setNote] = useState(transaction?.note ?? '');
  const [pickingCategory, setPickingCategory] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftMerchant, setDraftMerchant] = useState('');
  const [draftAmount, setDraftAmount] = useState('');
  const [draftKind, setDraftKind] = useState<TransactionKind>('expense');
  const [draftErrors, setDraftErrors] = useState<{ merchant?: string; amount?: string }>({});
  const [busy, setBusy] = useState(false);
  const [receiptRequest, setReceiptRequest] = useState<ReceiptRequest | null>(null);

  // Keep the note field in step if the record changes elsewhere (e.g. a sync).
  const [syncedNote, setSyncedNote] = useState(transaction?.note ?? '');
  if ((transaction?.note ?? '') !== syncedNote) {
    setSyncedNote(transaction?.note ?? '');
    setNote(transaction?.note ?? '');
  }

  const categories = useMemo(
    () => (transaction ? categoryOptionsFor(transaction.kind, transactions, transaction.category) : []),
    [transaction, transactions],
  );

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/activity');
    }
  };

  if (!transaction) {
    return (
      <Screen header>
        <EmptyState
          action={{ label: 'Back', onPress: leave }}
          body="It may have been deleted."
          icon="document-outline"
          title="Transaction not found"
        />
      </Screen>
    );
  }

  const isExpense = transaction.kind === 'expense';

  const update = async (patch: Partial<Omit<UpdateTransactionPayload, 'id'>>) => {
    const base = currentPayload(transaction);
    try {
      await actions.updateTransaction({ ...base, ...patch });
    } catch (error) {
      Alert.alert('Not saved', error instanceof Error ? error.message : 'Unable to update this transaction right now.');
    }
  };

  const saveNote = () => {
    if (note.trim() !== transaction.note.trim()) {
      void update({ note: note.trim() });
    }
  };

  const startEditing = () => {
    setDraftMerchant(transaction.merchant);
    setDraftAmount(String(Math.abs(transaction.amount)));
    setDraftKind(transaction.kind);
    setDraftErrors({});
    setEditing(true);
  };

  const saveEdits = async () => {
    const parsed = parseAmount(draftAmount);
    const errors = {
      merchant: draftMerchant.trim() ? undefined : 'Add a name.',
      amount: Number.isNaN(parsed) ? 'Enter an amount above zero.' : undefined,
    };
    setDraftErrors(errors);

    if (errors.merchant || errors.amount) {
      return;
    }

    const kindChanged = draftKind !== transaction.kind;
    setBusy(true);
    await update({
      amount: parsed,
      kind: draftKind,
      merchant: draftMerchant.trim(),
      category: kindChanged
        ? (categoryOptionsFor(draftKind, transactions)[0] ?? transaction.category)
        : transaction.category,
      deductible: draftKind === 'expense' ? (kindChanged ? true : transaction.deductible) : false,
    });
    setBusy(false);
    setEditing(false);
  };

  const attachReceipt = () => {
    const prefill: ReceiptRequest = {
      amount: String(Math.abs(transaction.amount)),
      category: transaction.category,
      note: transaction.note,
      transactionId: transaction.id,
      vendor: transaction.merchant,
    };

    chooseCaptureSource((source) => {
      if (source === 'manual') {
        setReceiptRequest(prefill);
        return;
      }

      void pickReceiptImage(source).then((asset) => {
        if (asset) {
          setReceiptRequest({ ...prefill, asset });
        }
      });
    }, 'Attach receipt');
  };

  const openReceipt = () => {
    if (!receipt) {
      return;
    }

    const verified = receipt.status === 'Verified';
    Alert.alert(receipt.vendor, receipt.note || undefined, [
      {
        text: verified ? 'Mark as needs review' : 'Mark as verified',
        onPress: () => void actions.toggleReceiptVerified(receipt.id),
      },
      {
        text: 'Delete receipt',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete receipt?', 'The receipt is removed from this expense.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => void actions.deleteReceipt(receipt.id) },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert('Delete transaction?', `${transaction.merchant} will be removed from your ledger.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void actions
            .deleteTransaction(transaction.id)
            .then(leave)
            .catch((error: unknown) =>
              Alert.alert('Not deleted', error instanceof Error ? error.message : 'Try again in a moment.'),
            );
        },
      },
    ]);
  };

  return (
    <Screen header>
      <Card tone="primary">
        <Text numberOfLines={1} tone="inverse" variant="subheading">
          {transaction.merchant}
        </Text>
        <Amount signed size="display" value={transaction.amount} />
        <Text tone="inverseMuted" variant="small">
          {formatFullDate(transaction.date)}
        </Text>
      </Card>

      {editing ? (
        <Card>
          <Segmented labels={kindLabels} onChange={setDraftKind} options={kinds} value={draftKind} />
          <Field
            autoCapitalize="words"
            error={draftErrors.merchant}
            label={draftKind === 'income' ? 'Client or payer' : 'Merchant'}
            onChangeText={setDraftMerchant}
            value={draftMerchant}
          />
          <Field
            error={draftErrors.amount}
            keyboardType="decimal-pad"
            label="Amount"
            onChangeText={setDraftAmount}
            prefix={currencySymbol(getDisplayCurrency())}
            style={tabularNums}
            value={draftAmount}
          />
          <View style={styles.buttons}>
            <Button
              fullWidth={false}
              label="Save"
              loading={busy}
              onPress={() => void saveEdits()}
              size="small"
            />
            <Button fullWidth={false} label="Cancel" onPress={() => setEditing(false)} size="small" variant="ghost" />
          </View>
        </Card>
      ) : null}

      <Section action={editing ? undefined : { label: 'Edit', onPress: startEditing }}>
        <List>
          <Row
            accessibilityLabel={`Category, ${transaction.category}. ${pickingCategory ? 'Hide' : 'Change'} category`}
            chevron
            icon="pricetags-outline"
            onPress={() => setPickingCategory((open) => !open)}
            title="Category"
            value={transaction.category || 'Uncategorized'}
          />
          {isExpense ? (
            <SwitchRow
              icon="pricetag-outline"
              onValueChange={() => void actions.toggleTransactionDeductible(transaction.id)}
              title="Deductible"
              value={transaction.deductible}
            />
          ) : null}
          <Row icon="card-outline" title="Account" value={transaction.source} />
          {transaction.receiptId ? (
            <Row
              chevron={Boolean(receipt)}
              icon={receipt?.storagePath ? 'image-outline' : 'receipt-outline'}
              iconTone={receipt?.status === 'Verified' ? 'positive' : 'accent'}
              onPress={receipt ? openReceipt : undefined}
              title="Receipt"
              trailing={
                receipt ? (
                  <Badge
                    label={receipt.status === 'Verified' ? 'Verified' : 'Review'}
                    tone={receipt.status === 'Verified' ? 'positive' : 'accent'}
                  />
                ) : undefined
              }
            />
          ) : isExpense ? (
            <Row chevron icon="camera-outline" iconTone="primary" onPress={attachReceipt} title="Attach receipt" />
          ) : null}
        </List>

        {pickingCategory ? (
          <Card tone="muted">
            <View style={styles.chips}>
              {categories.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  onPress={() => {
                    setPickingCategory(false);
                    if (option !== transaction.category) {
                      void update({ category: option });
                    }
                  }}
                  selected={transaction.category === option}
                />
              ))}
            </View>
          </Card>
        ) : null}
      </Section>

      <Field
        autoCapitalize="sentences"
        label="Note"
        multiline
        onBlur={saveNote}
        onChangeText={setNote}
        placeholder="Business purpose"
        style={styles.note}
        textAlignVertical="top"
        value={note}
      />

      <Button icon="trash-outline" label="Delete" onPress={confirmDelete} variant="destructive" />

      <ReceiptComposer onClose={() => setReceiptRequest(null)} request={receiptRequest} />
    </Screen>
  );
}

function currentPayload(transaction: Transaction): UpdateTransactionPayload {
  return {
    amount: Math.abs(transaction.amount),
    category: transaction.category,
    deductible: transaction.deductible,
    id: transaction.id,
    kind: transaction.kind,
    merchant: transaction.merchant,
    note: transaction.note,
  };
}

const styles = StyleSheet.create({
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
});
