import { useRouter } from 'expo-router';

import { Amount, Card, List, Row, Screen, Section, Text } from '@/components/ds';
import { useLedger } from '@/providers/ledger-provider';

/** One job: show how "Yours after tax" is worked out, line by line, for this year. */
export default function BreakdownScreen() {
  const router = useRouter();
  const { metrics, reservePercent } = useLedger();

  return (
    <Screen header>
      <Section title={`${metrics.year} so far`}>
        <List>
          <Row
            chevron
            icon="arrow-down-circle-outline"
            onPress={() => router.push('/activity')}
            title="Income"
            trailing={<Amount size="bodyMedium" value={metrics.income} />}
          />
          <Row
            chevron
            icon="arrow-up-circle-outline"
            onPress={() => router.push('/activity')}
            subtitle="Business costs, not tax payments"
            title="Expenses"
            trailing={<Amount size="bodyMedium" value={-metrics.expenses} />}
          />
          <Row title="Profit" trailing={<Amount size="bodyMedium" value={metrics.netProfit} />} />
        </List>
      </Section>

      <Section title="Tax">
        <List>
          <Row
            chevron
            icon="calculator-outline"
            onPress={() => router.push('/tax')}
            subtitle="Change the rate in Taxes"
            title={`Set aside at ${reservePercent}%`}
            trailing={<Amount size="bodyMedium" value={metrics.reserveTarget} />}
          />
          <Row
            icon="checkmark-circle-outline"
            subtitle="Expenses in the Taxes category"
            title="Already paid"
            trailing={<Amount size="bodyMedium" value={-metrics.taxPaid} />}
          />
          <Row title="Still to set aside" trailing={<Amount size="bodyMedium" value={metrics.stillToSetAside} />} />
        </List>
      </Section>

      <Card tone="primary">
        <Text tone="inverseMuted" variant="smallMedium">
          Yours after tax
        </Text>
        <Amount cents size="display" tone="inverse" value={metrics.afterTaxIncome} />
        <Text tone="inverseMuted" variant="small">
          Profit minus the tax set-aside.
        </Text>
      </Card>

      <Text align="center" tone="faint" variant="caption">
        Estimates, not tax advice.
      </Text>
    </Screen>
  );
}
