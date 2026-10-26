import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Amount, Text } from '@/components/ds';
import { radius, space } from '@/constants/theme';
import { formatCurrency } from '@/lib/formatters';
import { MoneyTotals } from '@/lib/summary';
import { useAppTheme } from '@/providers/app-theme-provider';

type MonthCardProps = {
  month: string;
  totals: MoneyTotals;
  onAdd: () => void;
  onPress: () => void;
};

/** The Home hero: what's left this month after money out, with money in and out underneath. */
export function MonthCard({ month, totals, onAdd, onPress }: MonthCardProps) {
  const { theme } = useAppTheme();
  const empty = totals.income === 0 && totals.expenses === 0;

  return (
    <Pressable
      accessibilityHint="Shows the year by category"
      accessibilityLabel={
        empty
          ? `${month}. Nothing added yet.`
          : `${month}, left over ${formatCurrency(totals.net, 2)}. In ${formatCurrency(totals.income, 0)}, out ${formatCurrency(totals.expenses, 0)}.`
      }
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.hero, opacity: pressed ? 0.92 : 1 }]}>
      <View style={styles.top}>
        <View style={styles.copy}>
          <Text variant="subheading" tone="inverse">
            Left over
          </Text>
          <Text variant="body" tone="inverseMuted">
            {month}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Add transaction"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAdd}
          style={({ pressed }) => [styles.add, { backgroundColor: pressed ? theme.borderStrong : 'transparent' }]}>
          <Ionicons color={theme.onHero} name="add" size={26} />
        </Pressable>
      </View>

      {empty ? (
        <Text variant="body" tone="inverseMuted">
          Add money in or out to see where you stand.
        </Text>
      ) : (
        <View style={styles.bottom}>
          <Amount size="display" tone="inverse" value={totals.net} cents />
          <View style={styles.footer}>
            <Flow icon="arrow-down" label="In" value={totals.income} />
            <Flow icon="arrow-up" label="Out" value={totals.expenses} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

function Flow({ icon, label, value }: { icon: 'arrow-down' | 'arrow-up'; label: string; value: number }) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.flow}>
      <Ionicons color={theme.onHero} name={icon} size={14} />
      <Text numberOfLines={1} variant="smallMedium" tone="inverse">
        {`${label} ${formatCurrency(value, 0)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    gap: space.xl,
    justifyContent: 'space-between',
    minHeight: 188,
    padding: space.lg + 2,
  },
  top: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  add: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  bottom: {
    gap: space.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: space.lg,
    marginTop: space.xs,
  },
  flow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
});
