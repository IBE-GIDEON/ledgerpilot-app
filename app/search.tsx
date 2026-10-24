import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Amount, Badge, Card, Chip, EmptyState, List, Row, Section, Text, useGutter } from '@/components/ds';
import {
  normalizeQuery,
  searchReceipts,
  searchTransactions,
  searchTrips,
  topCategories,
  yearTotals,
} from '@/components/search/search-utils';
import { fonts, radius, space } from '@/constants/theme';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';

/** Results per group before "and N more"; keeps the screen quick to scan. */
const GROUP_LIMIT = 25;

/** One job: find anything you've recorded, and see what it adds up to this year. */
export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gutter = useGutter();
  const { theme } = useAppTheme();
  const { receipts, transactions, trips } = useLedger();
  const [raw, setRaw] = useState('');

  const query = normalizeQuery(raw);
  const results = useMemo(() => {
    if (!query) {
      return null;
    }
    const matchedTransactions = searchTransactions(transactions, query);
    return {
      transactions: matchedTransactions,
      receipts: searchReceipts(receipts, query),
      trips: searchTrips(trips, query),
      totals: yearTotals(matchedTransactions),
    };
  }, [query, receipts, transactions, trips]);
  const suggestions = useMemo(() => topCategories(transactions), [transactions]);

  const openReceipt = (receiptId: string) => {
    const linked = transactions.find((item) => item.receiptId === receiptId);
    if (linked) {
      router.push({ pathname: '/transaction-detail', params: { id: linked.id } });
      return;
    }
    router.push({ pathname: '/activity', params: { segment: 'receipts' } });
  };

  const total = results ? results.transactions.length + results.receipts.length + results.trips.length : 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + space.sm }]}>
      <View style={[styles.bar, { paddingHorizontal: gutter }]}>
        <View style={[styles.field, { backgroundColor: theme.surface }]}>
          <Ionicons color={theme.textMuted} name="search" size={18} />
          <TextInput
            accessibilityLabel="Search"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            clearButtonMode="never"
            maxFontSizeMultiplier={1.6}
            onChangeText={setRaw}
            placeholder="Merchant, category or amount"
            placeholderTextColor={theme.textFaint}
            returnKeyType="search"
            selectionColor={theme.tint}
            style={[styles.input, { color: theme.text }]}
            value={raw}
          />
          {raw ? (
            <Pressable
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setRaw('')}>
              <Ionicons color={theme.textFaint} name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.back()}>
          <Text variant="bodyMedium">Cancel</Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: gutter, paddingBottom: insets.bottom + space.xxl },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled">
        {!results ? (
          suggestions.length > 0 ? (
            <Section title="Categories">
              <View style={styles.chips}>
                {suggestions.map((category) => (
                  <Chip key={category} label={category} onPress={() => setRaw(category)} />
                ))}
              </View>
            </Section>
          ) : (
            <EmptyState
              body="Transactions, receipts and trips all show up here."
              icon="search-outline"
              title="Search everything"
            />
          )
        ) : total === 0 ? (
          <EmptyState body="Try a merchant, a category or an amount." icon="search-outline" title="No matches" />
        ) : (
          <>
            {results.totals.count > 0 ? (
              <Card tone="primary">
                <Text tone="inverseMuted" variant="smallMedium">
                  {results.totals.spent > 0 ? 'Spent this year' : 'Earned this year'}
                </Text>
                <Amount
                  cents
                  size="display"
                  tone="inverse"
                  value={results.totals.spent > 0 ? results.totals.spent : results.totals.earned}
                />
                <Text tone="inverseMuted" variant="small">
                  {[
                    `${results.totals.count} ${results.totals.count === 1 ? 'transaction' : 'transactions'}`,
                    results.totals.spent > 0 && results.totals.earned > 0
                      ? `earned ${formatCurrency(results.totals.earned, 2)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </Card>
            ) : null}

            {results.transactions.length > 0 ? (
              <Section
                footnote={overflow(results.transactions.length)}
                title={`Transactions · ${results.transactions.length}`}>
                <List>
                  {results.transactions.slice(0, GROUP_LIMIT).map((item) => {
                    const amount = Math.abs(item.amount);
                    return (
                      <Row
                        key={item.id}
                        onPress={() => router.push({ pathname: '/transaction-detail', params: { id: item.id } })}
                        subtitle={`${item.category || 'Uncategorized'} · ${formatDate(item.date)}`}
                        title={item.merchant}
                        trailing={<Amount signed size="bodyMedium" value={item.kind === 'income' ? amount : -amount} />}
                      />
                    );
                  })}
                </List>
              </Section>
            ) : null}

            {results.receipts.length > 0 ? (
              <Section footnote={overflow(results.receipts.length)} title={`Receipts · ${results.receipts.length}`}>
                <List>
                  {results.receipts.slice(0, GROUP_LIMIT).map((item) => (
                    <Row
                      key={item.id}
                      icon="receipt-outline"
                      onPress={() => openReceipt(item.id)}
                      subtitle={`${item.category || 'Uncategorized'} · ${formatDate(item.date)}`}
                      title={item.vendor}
                      trailing={
                        <View style={styles.trailing}>
                          {item.status === 'Needs review' ? <Badge label="Review" tone="accent" /> : null}
                          <Amount size="bodyMedium" value={item.amount} />
                        </View>
                      }
                    />
                  ))}
                </List>
              </Section>
            ) : null}

            {results.trips.length > 0 ? (
              <Section footnote={overflow(results.trips.length)} title={`Trips · ${results.trips.length}`}>
                <List>
                  {results.trips.slice(0, GROUP_LIMIT).map((item) => (
                    <Row
                      key={item.id}
                      icon="car-outline"
                      onPress={() => router.push('/mileage')}
                      subtitle={item.purpose ? `${item.purpose} · ${formatDate(item.date)}` : formatDate(item.date)}
                      title={`${item.startLabel} → ${item.endLabel}`}
                      value={`${item.miles} mi`}
                    />
                  ))}
                </List>
              </Section>
            ) : null}
          </>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

function overflow(count: number) {
  return count > GROUP_LIMIT ? `Showing the latest ${GROUP_LIMIT} of ${count}.` : undefined;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  bar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    paddingBottom: space.md,
  },
  field: {
    alignItems: 'center',
    borderRadius: radius.control,
    flex: 1,
    flexDirection: 'row',
    gap: space.sm,
    height: 44,
    paddingHorizontal: space.md + 2,
  },
  input: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 16,
    height: 44,
  },
  content: {
    gap: space.xl,
    paddingTop: space.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  trailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
});
