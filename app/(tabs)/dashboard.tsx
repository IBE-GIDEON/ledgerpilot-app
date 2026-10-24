import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Amount, Button, Card, List, Row, Screen, Section, SpendBars, Text, Tile, useFeature } from '@/components/ds';
import { HomeHeader } from '@/components/home/home-header';
import { YoursAfterTaxCard } from '@/components/home/yours-after-tax-card';
import { getExpensesByCategory, getNextQuarter, getReviewCounts } from '@/components/taxes/tax-summary';
import { dataColors, space } from '@/constants/theme';
import { formatCompactCurrency, formatDate } from '@/lib/formatters';
import { useLedger } from '@/providers/ledger-provider';

/** One job: where do I stand. Everything else is a tap away. */
export default function HomeScreen() {
  const router = useRouter();
  const { metrics, profile, quarters, receipts, reservePercent, transactions, trips } = useLedger();
  const hasQuarterly = useFeature('quarterlyTax');

  const nextQuarter = getNextQuarter(quarters);
  const review = useMemo(() => getReviewCounts(transactions, receipts, trips), [transactions, receipts, trips]);
  const spending = useMemo(
    () =>
      getExpensesByCategory(transactions)
        .slice(0, 4)
        .map((entry, index) => ({
          key: entry.category,
          value: entry.total,
          color: dataColors[index % dataColors.length],
        })),
    [transactions]
  );
  const recent = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4),
    [transactions]
  );

  return (
    <Screen tab>
      <HomeHeader avatarUrl={profile.avatarUrl} hasAlerts={review.total > 0} name={profile.name} />

      <YoursAfterTaxCard
        afterTaxIncome={metrics.afterTaxIncome}
        hasIncome={metrics.income > 0}
        onAdd={() => router.push('/transaction-create')}
        onPress={() => router.push('/breakdown')}
        reservePercent={reservePercent}
        reserveTarget={metrics.reserveTarget}
        stillToSetAside={metrics.stillToSetAside}
        taxPaid={metrics.taxPaid}
        year={metrics.year}
      />

      {transactions.length === 0 ? (
        <Card>
          <Text variant="subheading">Add your first transaction</Text>
          <Text tone="muted" variant="small">
            Lancer works out your tax from what you add.
          </Text>
          <Button
            fullWidth={false}
            icon="add"
            label="Add"
            onPress={() => router.push('/transaction-create')}
            size="small"
            variant="secondary"
          />
        </Card>
      ) : null}

      {transactions.length > 0 ? (
        <View style={styles.row}>
          <Tile
            caption={formatCompactCurrency(metrics.expenses)}
            onPress={() => router.push('/activity')}
            title="Spending">
            <SpendBars segments={spending} />
          </Tile>
          <Tile
            caption={hasQuarterly && nextQuarter ? `Due ${formatDate(nextQuarter.dueDate)}` : 'Quarterly'}
            onPress={() => router.push('/tax')}
            title="Taxes">
            {hasQuarterly && nextQuarter ? (
              <Amount cents={false} size="heading" value={nextQuarter.amountDue} />
            ) : (
              <Text tone="muted" variant="smallMedium">
                Pro
              </Text>
            )}
          </Tile>
        </View>
      ) : null}

      {recent.length > 0 ? (
        <Section action={{ label: 'See all', onPress: () => router.push('/activity') }} title="Recent">
          <List>
            {recent.map((transaction) => {
              const amount = Math.abs(transaction.amount);
              return (
                <Row
                  key={transaction.id}
                  onPress={() =>
                    router.push({
                      pathname: '/transaction-detail',
                      params: { id: transaction.id },
                    })
                  }
                  subtitle={formatDate(transaction.date)}
                  title={transaction.merchant}
                  trailing={
                    <Amount signed size="bodyMedium" value={transaction.kind === 'income' ? amount : -amount} />
                  }
                />
              );
            })}
          </List>
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.md,
  },
});
