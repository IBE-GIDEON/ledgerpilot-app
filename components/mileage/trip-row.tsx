import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, Row, Text } from '@/components/ds';
import { space, tabularNums } from '@/constants/theme';
import { formatDate } from '@/lib/formatters';
import { MileageTrip, TripClassification } from '@/types/ledger';

const badgeTone: Record<TripClassification, 'primary' | 'accent' | 'neutral'> = {
  Business: 'primary',
  Mixed: 'accent',
  Personal: 'neutral',
};

type TripRowProps = {
  trip: MileageTrip;
  onCycle: (id: string) => void;
  onDelete: (id: string) => void;
};

export const TripRow = memo(function TripRow({ trip, onCycle, onDelete }: TripRowProps) {
  const route = `${trip.startLabel} → ${trip.endLabel}`;

  return (
    <Card padded={false}>
      <Row
        accessibilityLabel={`${route}, ${trip.miles.toFixed(1)} miles, ${trip.classification}. Tap to change type, press and hold to delete.`}
        onLongPress={() => onDelete(trip.id)}
        onPress={() => onCycle(trip.id)}
        subtitle={trip.purpose ? `${trip.purpose} · ${formatDate(trip.date)}` : formatDate(trip.date)}
        title={route}
        trailing={
          <View style={styles.trailing}>
            <Text numberOfLines={1} variant="bodyMedium" style={tabularNums}>
              {`${trip.miles.toFixed(1)} mi`}
            </Text>
            {/* Badge aligns itself to the start; the wrapper keeps it flush right. */}
            <View>
              <Badge label={trip.classification} tone={badgeTone[trip.classification]} />
            </View>
          </View>
        }
      />
    </Card>
  );
});

const styles = StyleSheet.create({
  trailing: {
    alignItems: 'flex-end',
    gap: space.xs,
  },
});
