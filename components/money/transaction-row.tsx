import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Amount, Text } from '@/components/ds';
import { ListCell } from '@/components/money/list-cell';
import { categoryColorIndex } from '@/components/money/money-utils';
import { dataColors, space } from '@/constants/theme';
import { useDisplayCurrency } from '@/lib/currency-context';
import { formatCurrency, formatDayTime } from '@/lib/formatters';
import { bankOf } from '@/lib/summary';
import { useAppTheme } from '@/providers/app-theme-provider';
import { Transaction } from '@/types/ledger';

type TransactionRowProps = {
  transaction: Transaction;
  first: boolean;
  last: boolean;
  needsReview: boolean;
  onPress: (id: string) => void;
};

/** Merchant with a category dot; category, bank, day and time beneath; the signed amount on the right. */
export const TransactionRow = memo(function TransactionRow({
  transaction,
  first,
  last,
  needsReview,
  onPress,
}: TransactionRowProps) {
  const { theme } = useAppTheme();
  useDisplayCurrency();
  const date = formatDayTime(transaction.date);
  const bank = bankOf(transaction);
  const category = transaction.category || 'Uncategorized';
  const direction = transaction.kind === 'income' ? 'received' : 'spent';
  const dotColor = dataColors[categoryColorIndex(transaction.category) % dataColors.length];

  return (
    <ListCell first={first} last={last}>
      <Pressable
        accessibilityLabel={`${transaction.merchant}, ${formatCurrency(Math.abs(transaction.amount), 2)} ${direction}, ${category}, ${date}, ${bank}${needsReview ? ', needs review' : ''}`}
        accessibilityRole="button"
        android_ripple={{ color: theme.surfaceMuted }}
        onPress={() => onPress(transaction.id)}
        style={({ pressed }) => [styles.row, pressed ? { backgroundColor: theme.surfaceMuted } : null]}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={styles.body}>
          <Text numberOfLines={1} variant="bodyMedium">
            {transaction.merchant}
          </Text>
          <Text numberOfLines={1} tone={needsReview ? 'accent' : 'muted'} variant="small">
            {`${category} · ${bank}`}
          </Text>
          <Text numberOfLines={1} tone="faint" variant="caption">
            {date}
          </Text>
        </View>
        <Amount signed size="bodyMedium" value={transaction.amount} />
      </Pressable>
    </ListCell>
  );
});

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    minHeight: 60,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  body: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
});
