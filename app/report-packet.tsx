import { useMemo, useState } from 'react';
import { Alert, Share } from 'react-native';

import { Amount, Button, Card, List, ProGate, Row, Screen, Section, Text, useFeature } from '@/components/ds';
import { buildPacketText } from '@/components/taxes/packet-export';
import { getExpensesByCategory, getMileageSummary } from '@/components/taxes/tax-summary';
import { useLedger } from '@/providers/ledger-provider';

/** One job: see the year's deductions and export the packet for your CPA. */
export default function ReportPacketScreen() {
  const { metrics, profile, receipts, transactions, trips } = useLedger();
  const unlocked = useFeature('cpaPacket');
  const [exporting, setExporting] = useState(false);

  const expenses = useMemo(() => getExpensesByCategory(transactions), [transactions]);
  const mileage = useMemo(() => getMileageSummary(trips), [trips]);

  const exportPacket = async () => {
    setExporting(true);
    try {
      const message = buildPacketText({ profile, transactions, receipts, trips, metrics });
      await Share.share({ title: 'Lancer CPA packet', message });
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen
      header
      footer={
        unlocked ? <Button icon="share-outline" label="Export" loading={exporting} onPress={exportPacket} /> : undefined
      }>
      <ProGate feature="cpaPacket">
        <Card tone="primary">
          <Text numberOfLines={1} tone="inverseMuted" variant="smallMedium">
            {`Net profit · ${new Date().getFullYear()}`}
          </Text>
          <Amount cents={false} size="display" tone="inverse" value={metrics.netProfit} />
          <Text numberOfLines={1} tone="inverseMuted" variant="small">
            {profile.name}
          </Text>
        </Card>

        <Section title="By category">
          <List>
            {expenses.map((item) => (
              <Row key={item.category} title={item.category} trailing={<Amount size="bodyMedium" value={item.total} />} />
            ))}
            <Row
              subtitle={`${Math.round(mileage.businessMiles).toLocaleString('en-US')} mi`}
              title="Mileage"
              trailing={<Amount size="bodyMedium" value={mileage.writeOff} />}
            />
            <Row title="Total" trailing={<Amount size="bodyMedium" value={metrics.deductibleTotal} />} />
          </List>
        </Section>

        <Text align="center" variant="caption" tone="faint">
          Estimates, not tax advice.
        </Text>
      </ProGate>
    </Screen>
  );
}
