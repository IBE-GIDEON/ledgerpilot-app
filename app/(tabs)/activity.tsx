import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItem,
  RefreshControl,
  ScrollView,
  SectionList,
  SectionListData,
  SectionListRenderItem,
  StyleSheet,
  View,
} from 'react-native';

import {
  Chip,
  EmptyState,
  Field,
  IconButton,
  List,
  PageHeader,
  ProGate,
  Row,
  Screen,
  Segmented,
  Text,
  useGutter,
  useManualInsets,
} from '@/components/ds';
import {
  internalSources,
  TransactionFilter,
  transactionFilters,
  transactionNeedsReview,
} from '@/components/money/money-utils';
import { chooseCaptureSource, pickReceiptImage } from '@/components/money/receipt-capture';
import { ReceiptComposer, ReceiptRequest } from '@/components/money/receipt-composer';
import { ReceiptRow } from '@/components/money/receipt-row';
import { TransactionRow } from '@/components/money/transaction-row';
import { photos } from '@/constants/images';
import { space } from '@/constants/theme';
import { featureFlags } from '@/lib/config/env';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';
import { Receipt, Transaction } from '@/types/ledger';

const segments = ['Transactions', 'Receipts'] as const;
type Segment = (typeof segments)[number];

// Chip label -> the receipt status it shows (undefined shows all).
const receiptFilters = ['All', 'To review', 'Verified'] as const;
type ReceiptFilter = (typeof receiptFilters)[number];
const receiptFilterStatus: Record<ReceiptFilter, Receipt['status'] | undefined> = {
  All: undefined,
  'To review': 'Needs review',
  Verified: 'Verified',
};

type MonthSection = { title: string; data: Transaction[] };

const byNewest = <T extends { date: string }>(left: T, right: T) =>
  new Date(right.date).getTime() - new Date(left.date).getTime();

const monthLabel = (date: string) =>
  new Date(date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

/** One job: find a transaction or receipt. Totals live on Home and Tax; details are a row tap away. */
export default function MoneyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ segment?: string }>();
  const { theme } = useAppTheme();
  const gutter = useGutter();
  const insets = useManualInsets({ tab: true });
  const { accounts, actions, receipts, transactions } = useLedger();

  const [segment, setSegment] = useState<Segment>(params.segment === 'receipts' ? 'Receipts' : 'Transactions');
  const [filter, setFilter] = useState<TransactionFilter>('All');
  const [query, setQuery] = useState('');
  const [receiptFilter, setReceiptFilter] = useState<ReceiptFilter>('All');
  const [receiptRequest, setReceiptRequest] = useState<ReceiptRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Other screens can deep-link straight to receipts with /activity?segment=receipts.
  const [linkedSegment, setLinkedSegment] = useState(params.segment);
  if (params.segment !== linkedSegment) {
    setLinkedSegment(params.segment);
    if (params.segment === 'receipts') {
      setSegment('Receipts');
    } else if (params.segment === 'transactions') {
      setSegment('Transactions');
    }
  }

  const receiptsById = useMemo(() => new Map(receipts.map((receipt) => [receipt.id, receipt])), [receipts]);
  const hasLinkedAccount = useMemo(
    () => accounts.some((account) => !internalSources.includes(account)),
    [accounts],
  );

  const sections = useMemo<MonthSection[]>(() => {
    const needle = query.trim().toLowerCase();

    const visible = transactions
      .filter((transaction) => {
        switch (filter) {
          case 'Income':
            if (transaction.kind !== 'income') return false;
            break;
          case 'Expenses':
            if (transaction.kind !== 'expense') return false;
            break;
          case 'Deductible':
            if (!transaction.deductible) return false;
            break;
          case 'Needs review':
            if (!transactionNeedsReview(transaction, receiptsById)) return false;
            break;
        }

        if (!needle) {
          return true;
        }

        return [transaction.merchant, transaction.category, transaction.source, transaction.note]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      })
      .sort(byNewest);

    const grouped: MonthSection[] = [];
    for (const transaction of visible) {
      const title = monthLabel(transaction.date);
      const current = grouped[grouped.length - 1];
      if (current?.title === title) {
        current.data.push(transaction);
      } else {
        grouped.push({ title, data: [transaction] });
      }
    }
    return grouped;
  }, [filter, query, receiptsById, transactions]);

  const visibleReceipts = useMemo(() => {
    const status = receiptFilterStatus[receiptFilter];
    const sorted = [...receipts].sort(byNewest);
    return status ? sorted.filter((receipt) => receipt.status === status) : sorted;
  }, [receiptFilter, receipts]);

  const openTransaction = useCallback(
    (id: string) => router.push({ pathname: '/transaction-detail', params: { id } }),
    [router],
  );

  const startReceipt = useCallback(() => {
    chooseCaptureSource((source) => {
      if (source === 'manual') {
        setReceiptRequest({});
        return;
      }

      void pickReceiptImage(source).then((asset) => {
        if (asset) {
          setReceiptRequest({ asset });
        }
      });
    });
  }, []);

  const confirmDeleteReceipt = useCallback(
    (receipt: Receipt) => {
      Alert.alert(
        'Delete receipt?',
        `${receipt.vendor} and any expense made from it will be removed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => void actions.deleteReceipt(receipt.id) },
        ],
      );
    },
    [actions],
  );

  const openReceiptActions = useCallback(
    (receipt: Receipt) => {
      const verified = receipt.status === 'Verified';
      Alert.alert(receipt.vendor, receipt.note || undefined, [
        {
          text: verified ? 'Mark as needs review' : 'Mark as verified',
          onPress: () => void actions.toggleReceiptVerified(receipt.id),
        },
        { text: 'Delete receipt', style: 'destructive', onPress: () => confirmDeleteReceipt(receipt) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [actions, confirmDeleteReceipt],
  );

  const renderTransaction = useCallback<SectionListRenderItem<Transaction, MonthSection>>(
    ({ item, index, section }) => (
      <TransactionRow
        first={index === 0}
        last={index === section.data.length - 1}
        needsReview={transactionNeedsReview(item, receiptsById)}
        onPress={openTransaction}
        transaction={item}
      />
    ),
    [openTransaction, receiptsById],
  );

  const renderMonth = useCallback(
    ({ section }: { section: SectionListData<Transaction, MonthSection> }) => (
      <Text style={styles.month} tone="muted" variant="smallMedium">
        {section.title}
      </Text>
    ),
    [],
  );

  const renderReceipt = useCallback<ListRenderItem<Receipt>>(
    ({ item, index }) => (
      <ReceiptRow
        first={index === 0}
        last={index === visibleReceipts.length - 1}
        onLongPress={confirmDeleteReceipt}
        onPress={openReceiptActions}
        receipt={item}
      />
    ),
    [confirmDeleteReceipt, openReceiptActions, visibleReceipts.length],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await actions.refreshData();
    } finally {
      setRefreshing(false);
    }
  }, [actions]);

  const listProps = {
    contentInsetAdjustmentBehavior: 'automatic' as const,
    contentContainerStyle: { paddingHorizontal: gutter, paddingBottom: insets.bottom + 32 },
    keyboardDismissMode: 'on-drag' as const,
    keyboardShouldPersistTaps: 'handled' as const,
    refreshControl: (
      <RefreshControl onRefresh={() => void onRefresh()} refreshing={refreshing} tintColor={theme.tint} />
    ),
    showsVerticalScrollIndicator: false,
    style: styles.list,
    initialNumToRender: 12,
    windowSize: 7,
  };

  const transactionsHeader = (
    <View style={styles.header}>
      <Field
        accessibilityLabel="Search transactions"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        label="Search"
        onChangeText={setQuery}
        placeholder="Merchant or category"
        returnKeyType="search"
        value={query}
      />

      <ScrollView
        contentContainerStyle={styles.chips}
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}>
        {transactionFilters.map((option) => (
          <Chip key={option} label={option} onPress={() => setFilter(option)} selected={filter === option} />
        ))}
      </ScrollView>

      {hasLinkedAccount || !featureFlags.bankSync ? null : (
        <ProGate feature="bankSync">
          <List>
            <Row chevron icon="business-outline" onPress={() => router.push('/connections')} title="Connect bank" />
          </List>
        </ProGate>
      )}
    </View>
  );

  const transactionsEmpty =
    transactions.length === 0 ? (
      <EmptyState
        action={{ label: 'Add', onPress: () => router.push('/transaction-create') }}
        body="Add one or connect a bank."
        icon="swap-vertical-outline"
        photo={photos.empty}
        title="No transactions"
      />
    ) : (
      <EmptyState
        action={{
          label: 'Show all',
          onPress: () => {
            setFilter('All');
            setQuery('');
          },
        }}
        body="Try another filter."
        icon="search-outline"
        title="No matches"
      />
    );

  const receiptsHeader =
    receipts.length > 0 ? (
      <View style={styles.header}>
        <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
          {receiptFilters.map((option) => (
            <Chip
              key={option}
              label={option}
              onPress={() => setReceiptFilter(option)}
              selected={receiptFilter === option}
            />
          ))}
        </ScrollView>
      </View>
    ) : null;

  const receiptsEmpty =
    receipts.length === 0 ? (
      <EmptyState
        action={{ label: 'Add receipt', onPress: startReceipt }}
        body="Snap or type one in."
        icon="receipt-outline"
        photo={photos.empty}
        title="No receipts"
      />
    ) : (
      <EmptyState
        action={{ label: 'Show all', onPress: () => setReceiptFilter('All') }}
        body={receiptFilter === 'To review' ? 'All checked.' : 'None verified yet.'}
        icon="checkmark-done-outline"
        title={receiptFilter === 'To review' ? 'Nothing to review' : 'No verified receipts'}
      />
    );

  return (
    <Screen contentStyle={styles.screen} scroll={false} tab>
      <View style={[styles.top, { paddingHorizontal: gutter }]}>
        <PageHeader
          title="Money"
          trailing={
            <IconButton
              icon="add"
              label={segment === 'Receipts' ? 'Add receipt' : 'Add transaction'}
              onPress={segment === 'Receipts' ? startReceipt : () => router.push('/transaction-create')}
            />
          }
        />
        <Segmented onChange={setSegment} options={segments} value={segment} />
      </View>

      {segment === 'Transactions' ? (
        <SectionList
          {...listProps}
          ListEmptyComponent={transactionsEmpty}
          ListHeaderComponent={transactionsHeader}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          renderSectionHeader={renderMonth}
          sections={sections}
          stickySectionHeadersEnabled={false}
        />
      ) : (
        <FlatList
          {...listProps}
          ListEmptyComponent={receiptsEmpty}
          ListHeaderComponent={receiptsHeader ?? undefined}
          data={visibleReceipts}
          keyExtractor={(item) => item.id}
          renderItem={renderReceipt}
        />
      )}

      <ReceiptComposer onClose={() => setReceiptRequest(null)} request={receiptRequest} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The list owns the horizontal gutter so rows can scroll edge to edge.
  screen: {
    gap: space.lg,
    paddingHorizontal: 0,
  },
  top: {
    gap: space.lg,
  },
  list: {
    flex: 1,
  },
  header: {
    gap: space.lg,
    paddingBottom: space.sm,
    paddingTop: space.xs,
  },
  chips: {
    gap: space.sm,
  },
  month: {
    paddingBottom: space.sm,
    paddingTop: space.lg,
  },
});
