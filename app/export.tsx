import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Amount, Button, Card, Screen, Text } from '@/components/ds';
import { shareStatementPdf, shareTransactionsCsv } from '@/components/export/statement-export';
import { space } from '@/constants/theme';
import { formatCurrency } from '@/lib/formatters';
import { useLedger } from '@/providers/ledger-provider';

/** One job: send the year's money in and out as a PDF statement or a spreadsheet. */
export default function ExportScreen() {
  const { metrics, profile, receipts, transactions } = useLedger();
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  const year = metrics.year;

  const run = async (kind: 'pdf' | 'csv') => {
    setExporting(kind);
    try {
      if (kind === 'pdf') {
        await shareStatementPdf({ year, profile, transactions, receipts });
      } else {
        await shareTransactionsCsv({ year, transactions });
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
      <Card tone="primary">
        <Text numberOfLines={1} tone="inverseMuted" variant="smallMedium">
          {`Left over · ${year}`}
        </Text>
        <Amount cents={false} size="display" tone="inverse" value={metrics.thisYear.net} />
        <Text numberOfLines={1} tone="inverseMuted" variant="small">
          {`In ${formatCurrency(metrics.thisYear.income, 0)} · Out ${formatCurrency(metrics.thisYear.expenses, 0)}`}
        </Text>
      </Card>

      <Text align="center" variant="caption" tone="faint">
        The PDF has your totals, each category and every transaction with its bank.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: space.sm,
  },
});
