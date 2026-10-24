import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Amount, Text } from '@/components/ds';
import { radius, space } from '@/constants/theme';
import { formatCurrency } from '@/lib/formatters';
import { useAppTheme } from '@/providers/app-theme-provider';

type YoursAfterTaxCardProps = {
  year: number;
  afterTaxIncome: number;
  reservePercent: number;
  reserveTarget: number;
  taxPaid: number;
  stillToSetAside: number;
  hasIncome: boolean;
  onAdd: () => void;
  onPress: () => void;
};

/**
 * The Home hero: this year's profit after the tax set-aside, and how much of that set-aside
 * still isn't covered by tax payments. Tapping opens the full breakdown.
 */
export function YoursAfterTaxCard({
  year,
  afterTaxIncome,
  reservePercent,
  reserveTarget,
  taxPaid,
  stillToSetAside,
  hasIncome,
  onAdd,
  onPress,
}: YoursAfterTaxCardProps) {
  const { theme } = useAppTheme();
  const covered = reserveTarget > 0 && stillToSetAside === 0;

  return (
    <Pressable
      accessibilityHint="Shows how this is worked out"
      accessibilityLabel={
        hasIncome
          ? `Yours after tax in ${year}, ${formatCurrency(afterTaxIncome, 2)}. Still to set aside ${formatCurrency(stillToSetAside, 0)}.`
          : `Yours after tax in ${year}. Add income to see it.`
      }
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.hero, opacity: pressed ? 0.92 : 1 }]}>
      <View style={styles.top}>
        <View style={styles.copy}>
          <Text variant="subheading" tone="inverse">
            Yours after tax
          </Text>
          <Text variant="body" tone="inverseMuted">
            {year}
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

      {hasIncome ? (
        <View style={styles.bottom}>
          <Amount size="display" tone="inverse" value={afterTaxIncome} cents />
          <View style={styles.footer}>
            <Text numberOfLines={1} variant="smallMedium" tone="inverse" style={styles.flex}>
              {covered ? 'Tax covered' : 'Still to set aside'}
            </Text>
            {covered ? (
              <Ionicons color={theme.positive} name="checkmark-circle" size={18} />
            ) : (
              <Text numberOfLines={1} variant="smallMedium" tone="inverse">
                {formatCurrency(stillToSetAside, 0)}
              </Text>
            )}
          </View>
          <Text numberOfLines={1} variant="small" tone="inverseMuted">
            {`${reservePercent}% of profit · ${formatCurrency(reserveTarget, 0)}${
              taxPaid > 0 ? ` · ${formatCurrency(taxPaid, 0)} paid` : ''
            }`}
          </Text>
        </View>
      ) : (
        <Text variant="body" tone="inverseMuted">
          Add income to see what’s yours after tax.
        </Text>
      )}
    </Pressable>
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.xs,
  },
  flex: {
    flex: 1,
  },
});
