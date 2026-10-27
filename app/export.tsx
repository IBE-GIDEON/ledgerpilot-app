import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Amount, Button, Card, Chip, Screen, Text } from '@/components/ds';
import { shareStatementPdf, shareTransactionsCsv } from '@/components/export/statement-export';
import { space } from '@/constants/theme';
import { formatCurrency } from '@/lib/formatters';
import { getBankTotals } from '@/lib/summary';
import { useLedger } from '@/providers/ledger-provider';

/** One job: send the year's money in and out, for every bank or just one, as a PDF statement or a spreadsheet. */
export default function ExportScreen() {
  const params = useLocalSearchParams<{ bank?: string }>();
  const { metrics, profile, receipts, transactions } = useLedger();
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  const year = metrics.year;

  // Every bank that has money in or out this year, busiest first.
  const bankTotals = useMemo(
    () => getBankTotals(transactions, 'year', new Date(year, 11, 31)).filter((item) => item.count > 0),
    [transactions, year]
  );
  const [bank, setBank] = useState<string | null>(
    params.bank && bankTotals.some((item) => item.bank === params.bank) ? params.bank : null
  );
  const chosen = bank ? bankTotals.find((item) => item.bank === bank) : null;
  const totals = chosen ?? metrics.thisYear;

  const run = async (kind: 'pdf' | 'csv') => {
    setExporting(kind);
    try {
      if (kind === 'pdf') {
        await shareStatementPdf({ year, profile, transactions, receipts, bank });
      } else {
        await shareTransactionsCsv({ year, transactions, bank });
      }
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <Screen
      header
      footer={
        <View style={styles.actions}>
          <Button
            disabled={exporting !== null}
            icon="document-text-outline"
            label="Send PDF"
            loading={exporting === 'pdf'}
            onPress={() => void run('pdf')}
          />
          <Button
            disabled={exporting !== null}
            icon="grid-outline"
            label="Send spreadsheet"
            loading={exporting === 'csv'}
            onPress={() => void run('csv')}
            variant="secondary"
          />
        </View>
      }>
      {bankTotals.length > 1 ? (
        <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="All banks" onPress={() => setBank(null)} selected={bank === null} />
          {bankTotals.map((item) => (
            <Chip key={item.bank} label={item.bank} onPress={() => setBank(item.bank)} selected={bank === item.bank} />
          ))}
        </ScrollView>
      ) : null}

      <Card tone="primary">
        <Text numberOfLines={1} tone="inverseMuted" variant="smallMedium">
          {`Left over · ${bank ?? 'All banks'} · ${year}`}
        </Text>
        <Amount cents={false} size="display" tone="inverse" value={totals.net} />
        <Text numberOfLines={1} tone="inverseMuted" variant="small">
          {`In ${formatCurrency(totals.income, 0)} · Out ${formatCurrency(totals.expenses, 0)}`}
        </Text>
      </Card>

      <Text align="center" variant="caption" tone="faint">
        {bank
          ? `Only ${bank}: its totals, each category and every transaction, with day and time.`
          : 'Every bank: totals, each bank, each category and every transaction with its bank.'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: space.sm,
  },
  chips: {
    gap: space.sm,
  },
});
