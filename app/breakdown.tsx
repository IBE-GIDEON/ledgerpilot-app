import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { Amount, Card, EmptyState, List, Row, Screen, Section, Text } from '@/components/ds';
import { formatCurrency } from '@/lib/formatters';
import { getBankTotals, getCategoryTotals } from '@/lib/summary';
import { useLedger } from '@/providers/ledger-provider';

/** One job: where this year's money came from and went, by category and by bank. */
export default function BreakdownScreen() {
  const router = useRouter();
  const { metrics, transactions } = useLedger();

  const moneyIn = useMemo(() => getCategoryTotals(transactions, 'income'), [transactions]);
  const moneyOut = useMemo(() => getCategoryTotals(transactions, 'expense'), [transactions]);
  const banks = useMemo(() => getBankTotals(transactions, 'year'), [transactions]);
  const totals = metrics.thisYear;

  if (totals.income === 0 && totals.expenses === 0) {
    return (
      <Screen header>
        <EmptyState
          action={{ label: 'Add', onPress: () => router.push('/transaction-create') }}
          body="Add money in or out to see your year."
          icon="pie-chart-outline"
          title="Nothing yet"
        />
      </Screen>
    );
  }

  return (
    <Screen header>
      <Card tone="primary">
        <Text tone="inverseMuted" variant="smallMedium">
          {`Left over · ${metrics.year}`}
        </Text>
        <Amount cents size="display" tone="inverse" value={totals.net} />
        <Text tone="inverseMuted" variant="small">
          {`In ${formatCurrency(totals.income, 0)} · Out ${formatCurrency(totals.expenses, 0)}`}
        </Text>
      </Card>

      <Section title="By bank">
        <List>
          {banks.map((bank) => (
            <Row
              key={bank.bank}
              chevron
              onPress={() => router.push({ pathname: '/activity', params: { bank: bank.bank } })}
              subtitle={`In ${formatCurrency(bank.income, 0)} · Out ${formatCurrency(bank.expenses, 0)}`}
              title={bank.bank}
              trailing={<Amount signed size="bodyMedium" value={bank.net} />}
            />
          ))}
        </List>
      </Section>

      {moneyIn.length > 0 ? (
        <Section title="Money in">
          <List>
            {moneyIn.map((item) => (
              <Row key={item.category} title={item.category} trailing={<Amount size="bodyMedium" value={item.total} />} />
            ))}
          </List>
        </Section>
      ) : null}

      {moneyOut.length > 0 ? (
        <Section title="Money out">
          <List>
            {moneyOut.map((item) => (
              <Row key={item.category} title={item.category} trailing={<Amount size="bodyMedium" value={item.total} />} />
            ))}
          </List>
        </Section>
      ) : null}

      <Row chevron icon="share-outline" onPress={() => router.push('/export')} title="Export the year" />
    </Screen>
  );
}
