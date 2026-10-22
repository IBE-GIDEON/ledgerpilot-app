import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, ListRenderItem, StyleSheet, View } from 'react-native';

import {
  Amount,
  Card,
  EmptyState,
  IconButton,
  PageHeader,
  ProGate,
  Screen,
  Section,
  Text,
  Tile,
  useGutter,
  useManualInsets,
} from '@/components/ds';
import { AddTripCard } from '@/components/mileage/add-trip-card';
import { AutoTrackingCard } from '@/components/mileage/auto-tracking-card';
import { TripRow } from '@/components/mileage/trip-row';
import { space, tabularNums } from '@/constants/theme';
import { BUSINESS_MILEAGE_RATE_2026 } from '@/lib/tax';
import { useLedger } from '@/providers/ledger-provider';
import { MileageTrip } from '@/types/ledger';

const milesFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

export default function MileageScreen() {
  const { actions, metrics, trips } = useLedger();
  const gutter = useGutter();
  const bottomInset = useManualInsets({ tab: true }).bottom;
  const [adding, setAdding] = useState(false);

  const { addTrip, cycleTripClassification, deleteTrip } = actions;

  // Mixed trips count half, matching how the deduction is calculated.
  const businessMiles = useMemo(
    () =>
      trips.reduce((total, trip) => {
        if (trip.classification === 'Business') return total + trip.miles;
        if (trip.classification === 'Mixed') return total + trip.miles / 2;
        return total;
      }, 0),
    [trips]
  );

  const handleCycle = useCallback(
    (id: string) => {
      void cycleTripClassification(id);
    },
    [cycleTripClassification]
  );

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('Delete trip?', 'This removes the trip from your mileage history.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteTrip(id);
          },
        },
      ]);
    },
    [deleteTrip]
  );

  const renderItem = useCallback<ListRenderItem<MileageTrip>>(
    ({ item }) => <TripRow onCycle={handleCycle} onDelete={handleDelete} trip={item} />,
    [handleCycle, handleDelete]
  );

  const rate = `$${BUSINESS_MILEAGE_RATE_2026.toFixed(3)}`;

  const header = (
    <View style={styles.header}>
      <PageHeader
        title="Mileage"
        trailing={
          <IconButton
            icon={adding ? 'close' : 'add'}
            label={adding ? 'Close trip form' : 'Log a trip'}
            onPress={() => setAdding((value) => !value)}
          />
        }
      />

      {adding ? <AddTripCard onAdd={addTrip} onClose={() => setAdding(false)} /> : null}

      <Card tone="primary">
        <Text tone="inverseMuted" variant="small">
          Deduction
        </Text>
        <Amount size="display" tone="inverse" value={metrics.mileageWriteOff} />
        <Text tone="inverseMuted" variant="small">
          {`${rate} per mile`}
        </Text>
      </Card>

      <View style={styles.row}>
        <Tile caption="Mixed count half" title="Business miles">
          <Text numberOfLines={1} variant="title" style={tabularNums}>
            {milesFormatter.format(businessMiles)}
          </Text>
        </Tile>
        <Tile caption="Logged" title="Trips">
          <Text numberOfLines={1} variant="title" style={tabularNums}>
            {trips.length}
          </Text>
        </Tile>
      </View>

      <ProGate feature="autoMileage">
        <AutoTrackingCard onAddTrip={addTrip} />
      </ProGate>

      {trips.length > 0 ? (
        <Section title="Trips">
          <Text variant="small" tone="faint">
            Tap to change type · hold to delete
          </Text>
        </Section>
      ) : null}
    </View>
  );

  return (
    <Screen contentStyle={styles.noGutter} keyboard scroll={false} tab>
      <FlatList
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={
          <EmptyState
            action={adding ? undefined : { label: 'Log trip', onPress: () => setAdding(true) }}
            body="Log a drive to start."
            icon="car-outline"
            title="No trips yet"
          />
        }
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: bottomInset + 32 }}
        contentInsetAdjustmentBehavior="automatic"
        data={trips}
        keyExtractor={keyExtractor}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const keyExtractor = (trip: MileageTrip) => trip.id;

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  // Screen pads non-scrolling content; the list applies the gutter itself so it scrolls edge to edge.
  noGutter: {
    paddingHorizontal: 0,
  },
  header: {
    gap: space.md,
    paddingBottom: space.md,
  },
  row: {
    flexDirection: 'row',
    gap: space.md,
  },
  separator: {
    height: space.sm,
  },
});
