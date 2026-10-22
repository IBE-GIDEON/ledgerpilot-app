import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Amount, Badge, Row } from '@/components/ds';
import { ListCell } from '@/components/money/list-cell';
import { space } from '@/constants/theme';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Receipt } from '@/types/ledger';

type ReceiptRowProps = {
  receipt: Receipt;
  first: boolean;
  last: boolean;
  onPress: (receipt: Receipt) => void;
  onLongPress: (receipt: Receipt) => void;
};

export const ReceiptRow = memo(function ReceiptRow({ receipt, first, last, onPress, onLongPress }: ReceiptRowProps) {
  const verified = receipt.status === 'Verified';
  const date = formatDate(receipt.date);

  return (
    <ListCell first={first} last={last}>
      <Row
        accessibilityLabel={`${receipt.vendor}, ${formatCurrency(receipt.amount, 2)}, ${receipt.category}, ${date}, ${receipt.status}${
          receipt.storagePath ? ', photo attached' : ''
        }`}
        icon={receipt.storagePath ? 'image-outline' : 'receipt-outline'}
        iconTone={verified ? 'positive' : 'accent'}
        onLongPress={() => onLongPress(receipt)}
        onPress={() => onPress(receipt)}
        subtitle={date}
        title={receipt.vendor}
        trailing={
          <View style={styles.trailing}>
            <Amount size="bodyMedium" value={receipt.amount} />
            {verified ? null : <Badge label="Review" tone="accent" />}
          </View>
        }
      />
    </ListCell>
  );
});

const styles = StyleSheet.create({
  trailing: {
    alignItems: 'flex-end',
    gap: space.xs,
  },
});
