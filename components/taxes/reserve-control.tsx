import { StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/components/ds';
import { space, tabularNums } from '@/constants/theme';

/** Matches the clamp in the ledger provider. */
export const RESERVE_MIN = 10;
export const RESERVE_MAX = 45;

type ReserveControlProps = {
  value: number;
  onChange: (value: number) => void;
};

/** One row: the set-aside percent with − and + buttons. */
export function ReserveControl({ value, onChange }: ReserveControlProps) {
  const set = (next: number) => onChange(Math.max(RESERVE_MIN, Math.min(RESERVE_MAX, next)));

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text variant="subheading">Set aside</Text>
        <Text tone="muted" variant="small">
          Of profit
        </Text>
      </View>
      <IconButton icon="remove" label={`Lower to ${Math.max(RESERVE_MIN, value - 1)} percent`} onPress={() => set(value - 1)} />
      <Text
        accessibilityLabel={`${value} percent`}
        accessibilityLiveRegion="polite"
        align="center"
        style={[tabularNums, styles.value]}
        variant="heading">
        {`${value}%`}
      </Text>
      <IconButton icon="add" label={`Raise to ${Math.min(RESERVE_MAX, value + 1)} percent`} onPress={() => set(value + 1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  value: {
    minWidth: 52,
  },
});
