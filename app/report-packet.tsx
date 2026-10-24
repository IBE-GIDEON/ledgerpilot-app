import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Amount, Button, Card, List, ProGate, Row, Screen, Section, Text, useFeature } from '@/components/ds';
import { sharePacketPdf, shareTransactionsCsv } from '@/components/taxes/packet-export';
import { getDeductionsByCategory, getMileageSummary } from '@/components/taxes/tax-summary';
import { space } from '@/constants/theme';
import { useLedger } from '@/providers/ledger-provider';

/** One job: see the year's deductions and send your accountant a PDF and a spreadsheet. */
export default function ReportPacketScreen() {
  const { metrics, profile, receipts, reservePercent, transactions, trips } = useLedger();
  const unlocked = useFeature('cpaPacket');
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);

  const year = metrics.year;
  const deductions = useMemo(() => getDeductionsByCategory(transactions, year), [transactions, year]);
  const mileage = useMemo(
    () => getMileageSummary(trips.filter((trip) => new Date(trip.date).getFullYear() === year)),
    [trips, year]
  );

  const run = async (kind: 'pdf' | 'csv') => {
    setExporting(kind);
    try {
      if (kind === 'pdf') {
        await sharePacketPdf({ year, profile, transactions, receipts, trips, reservePercent, metrics });
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
        unlocked ? (
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
        ) : undefined
      }>
      <ProGate feature="cpaPacket">
        <Card tone="primary">
          <Text numberOfLines={1} tone="inverseMuted" variant="smallMedium">
            {`Net profit · ${year}`}
          </Text>
          <Amount cents={false} size="display" tone="inverse" value={metrics.netProfit} />
          <Text numberOfLines={1} tone="inverseMuted" variant="small">
            {profile.name}
          </Text>
        </Card>

        <Section title="Deductions">
          <List>
            {deductions.map((item) => (
              <Row key={item.category} title={item.category} trailing={<Amount size="bodyMedium" value={item.total} />} />
            ))}
            <Row
              subtitle={`${Math.round(mileage.businessMiles).toLocaleString('en-US')} mi`}
              title="Mileage"
              trailing={<Amount size="bodyMedium" value={metrics.mileageWriteOff} />}
            />
            <Row title="Total" trailing={<Amount size="bodyMedium" value={metrics.deductibleTotal} />} />
          </List>
        </Section>

        <Text align="center" variant="caption" tone="faint">
          The PDF has your summary, categories, mileage log and every transaction.
        </Text>
      </ProGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: space.sm,
  },
});
