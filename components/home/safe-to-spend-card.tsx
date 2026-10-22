import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Amount, Card, Text } from '@/components/ds';
import { radius, space } from '@/constants/theme';
import { formatCurrency } from '@/lib/formatters';
import { useAppTheme } from '@/providers/app-theme-provider';

type SafeToSpendCardProps = {
  safeToSpend: number;
  setAside: number;
  reservePercent: number;
  onAdd: () => void;
};

/** The Home "wallet" card: what is safe to spend after tax, with a quick add. */
export function SafeToSpendCard({ safeToSpend, setAside, reservePercent, onAdd }: SafeToSpendCardProps) {
  const { theme } = useAppTheme();

  return (
    <Card tone="primary" style={styles.card}>
      <View style={styles.top}>
        <View style={styles.copy}>
          <Text variant="subheading" tone="inverse">
            Safe to spend
          </Text>
          <Text variant="body" tone="inverseMuted">
            Year to date
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

      <View style={styles.bottom}>
        <Amount size="display" tone="inverse" value={safeToSpend} cents />
        <View style={styles.footer}>
          <Text numberOfLines={1} variant="small" tone="inverseMuted" style={styles.flex}>
            {`${reservePercent}% set aside for tax`}
          </Text>
          <Text numberOfLines={1} variant="smallMedium" tone="inverseMuted">
            {formatCurrency(setAside, 0)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.xxl,
    minHeight: 188,
    justifyContent: 'space-between',
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
  },
  flex: {
    flex: 1,
  },
});
