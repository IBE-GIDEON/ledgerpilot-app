import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Amount, Button, Card, List, Row, Screen, Section, SpendBars, Text, Tile } from '@/components/ds';
import { HomeHeader } from '@/components/home/home-header';
import { MonthCard } from '@/components/home/month-card';
import { dataColors, space } from '@/constants/theme';
import { formatCompactCurrency, formatCurrency, formatDayTime } from '@/lib/formatters';
import { bankOf, getBankTotals, getCategoryTotals, getReviewCounts, monthLabel } from '@/lib/summary';
import { LancerAlerts } from '@/modules/lancer-alerts';
import { useLedger } from '@/providers/ledger-provider';
import { Transaction } from '@/types/ledger';

function categoryBars(transactions: Transaction[], kind: Transaction['kind']) {
  return getCategoryTotals(transactions, kind, 'month')
    .slice(0, 4)
    .map((entry, index) => ({ key: entry.category, value: entry.total, color: dataColors[index % dataColors.length] }));
}

/** One job: where my money went this month, and through which bank. Everything else is a tap away. */
export default function HomeScreen() {
  const router = useRouter();
  const { metrics, profile, receipts, transactions } = useLedger();

  const review = useMemo(() => getReviewCounts(transactions, receipts), [transactions, receipts]);
  const spending = useMemo(() => categoryBars(transactions, 'expense'), [transactions]);
  const earning = useMemo(() => categoryBars(transactions, 'income'), [transactions]);
  const banks = useMemo(() => getBankTotals(transactions, 'month'), [transactions]);
  const recent = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [transactions]
  );

  // Android only: nudge until bank alerts are on, since that's what fills Lancer in by itself.
  const [alertsOff, setAlertsOff] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setAlertsOff(Boolean(LancerAlerts) && !LancerAlerts?.isAccessGranted());
    }, [])
  );

  const openBank = (bank: string) => router.push({ pathname: '/activity', params: { bank } });

  return (
    <Screen tab>
      <HomeHeader avatarUrl={profile.avatarUrl} hasAlerts={review.total > 0} name={profile.name} />

      <MonthCard
        month={monthLabel()}
        onAdd={() => router.push('/transaction-create')}
        onPress={() => router.push('/breakdown')}
        totals={metrics.month}
      />

      {alertsOff ? (
        <Card>
          <Text variant="subheading">Catch bank alerts automatically</Text>
          <Text tone="muted" variant="small">
            Lancer spots money in and out from your bank apps and texts, then asks what it was for.
          </Text>
          <Button
            fullWidth={false}
            icon="flash-outline"
            label="Turn on"
            onPress={() => router.push('/bank-alerts')}
            size="small"
            variant="secondary"
          />
        </Card>
      ) : null}

      {transactions.length === 0 ? (
        <Card>
          <Text variant="subheading">Add your first transaction</Text>
          <Text tone="muted" variant="small">
            Note which bank it went through and Lancer keeps each one apart.
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
          <Tile caption={formatCompactCurrency(metrics.month.income)} onPress={() => router.push('/breakdown')} title="In">
            <SpendBars segments={earning} />
          </Tile>
          <Tile caption={formatCompactCurrency(metrics.month.expenses)} onPress={() => router.push('/breakdown')} title="Out">
            <SpendBars segments={spending} />
          </Tile>
        </View>
      ) : null}

      {banks.length > 0 ? (
        <Section title="By bank this month">
          <List>
            {banks.map((bank) => (
              <Row
                key={bank.bank}
                chevron
                icon={bank.bank === 'Cash & other' ? 'wallet-outline' : 'business-outline'}
                onPress={() => openBank(bank.bank)}
                subtitle={`In ${formatCurrency(bank.income, 0)} · Out ${formatCurrency(bank.expenses, 0)}`}
                title={bank.bank}
                trailing={<Amount signed size="bodyMedium" value={bank.net} />}
              />
            ))}
          </List>
        </Section>
      ) : null}

      {recent.length > 0 ? (
        <Section action={{ label: 'See all', onPress: () => router.push('/activity') }} title="Recent">
          <List>
            {recent.map((transaction) => {
              const amount = Math.abs(transaction.amount);
              return (
                <Row
                  key={transaction.id}
                  onPress={() => router.push({ pathname: '/transaction-detail', params: { id: transaction.id } })}
                  subtitle={`${bankOf(transaction)} · ${formatDayTime(transaction.date)}`}
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
