import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { Divider } from '@/components/ds';
import { radius, space } from '@/constants/theme';
import { useAppTheme } from '@/providers/app-theme-provider';

type ListCellProps = PropsWithChildren<{ first: boolean; last: boolean }>;

/**
 * One row of a virtualised list drawn to match the DS `List` container: a shared
 * charcoal surface with rounded ends and hairline dividers between rows.
 */
export function ListCell({ first, last, children }: ListCellProps) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        styles.cell,
        { backgroundColor: theme.surface },
        first ? styles.first : null,
        last ? styles.last : null,
      ]}>
      {first ? null : <Divider inset={space.lg} />}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    overflow: 'hidden',
  },
  first: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  last: {
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
  },
});
