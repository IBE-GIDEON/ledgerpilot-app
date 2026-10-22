import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Amount, Badge, Card, List, PageHeader, ProGate, Row, Screen, Section, Text } from '@/components/ds';
import { ReserveControl } from '@/components/taxes/reserve-control';
import { getNextQuarter, getQuarterReserve } from '@/components/taxes/tax-summary';
import { space } from '@/constants/theme';
import { formatCompactCurrency, formatDate, formatFullDate } from '@/lib/formatters';
import { useLedger } from '@/providers/ledger-provider';

/** One job: what to pay, and when. Deductions and Schedule C live in the year-end packet. */
export default function TaxesScreen() {
  const router = useRouter();
  const { actions, metrics, quarters, reservePercent, transactions } = useLedger();

  const nextQuarter = getNextQuarter(quarters);
  const quarterReserve = useMemo(
    () => getQuarterReserve(quarters, nextQuarter, transactions, reservePercent),
    [quarters, nextQuarter, transactions, reservePercent]
  );
  const gap = Math.max(0, (nextQuarter?.amountDue ?? 0) - quarterReserve.reserved);

  return (
    <Screen tab>
      <PageHeader title="Taxes" />

      {nextQuarter ? (
        <ProGate feature="quarterlyTax">
          <Card tone="primary">
            <Text tone="inverseMuted" variant="smallMedium">
              {`${nextQuarter.label} payment`}
            </Text>
            <Amount cents={false} size="display" tone="inverse" value={nextQuarter.amountDue} />
            <Text tone="inverseMuted" variant="small">
              {`Due ${formatFullDate(nextQuarter.dueDate)}${gap > 0 ? ` · ${formatCompactCurrency(gap)} short` : ''}`}
            </Text>
          </Card>
        </ProGate>
      ) : null}

      <Card>
        <ReserveControl onChange={(value) => void actions.setReservePercent(value)} value={reservePercent} />
      </Card>

      <Section title="This year">
        <ProGate feature="quarterlyTax">
          <List>
            {quarters.map((quarter) => (
              <Row
                key={quarter.id}
                subtitle={formatDate(quarter.dueDate)}
                title={quarter.label}
                trailing={
                  <View style={styles.trailing}>
                    {quarter.status === 'Next up' ? <Badge label="Next" tone="accent" /> : null}
                    <Amount size="bodyMedium" value={quarter.amountDue} />
                  </View>
                }
              />
            ))}
          </List>
        </ProGate>
      </Section>

      <List>
        <Row
          chevron
          icon="briefcase-outline"
          onPress={() => router.push('/report-packet')}
          title="Year-end packet"
          value={formatCompactCurrency(metrics.deductibleTotal) + ' deductions'}
        />
      </List>

      <Text align="center" tone="faint" variant="caption">
        Estimates, not tax advice.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  trailing: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
});
