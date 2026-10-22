import { useRef, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Field, IconButton, Segmented, Text } from '@/components/ds';
import { space } from '@/constants/theme';
import { AddTripPayload } from '@/lib/backend/payloads';
import { TripClassification } from '@/types/ledger';

const classifications = ['Business', 'Mixed', 'Personal'] as const satisfies readonly TripClassification[];

type AddTripCardProps = {
  onAdd: (payload: AddTripPayload) => Promise<void>;
  onClose: () => void;
};

/** Manual trip entry. Shown above the trip list when the header's add button is pressed. */
export function AddTripCard({ onAdd, onClose }: AddTripCardProps) {
  const [startLabel, setStartLabel] = useState('');
  const [endLabel, setEndLabel] = useState('');
  const [miles, setMiles] = useState('');
  const [purpose, setPurpose] = useState('');
  const [classification, setClassification] = useState<TripClassification>('Business');
  const [saving, setSaving] = useState(false);

  const endRef = useRef<TextInput>(null);
  const milesRef = useRef<TextInput>(null);
  const purposeRef = useRef<TextInput>(null);

  const handleSave = async () => {
    const parsedMiles = Number(miles.replace(',', '.'));

    if (!startLabel.trim() || !endLabel.trim() || !Number.isFinite(parsedMiles) || parsedMiles <= 0) {
      Alert.alert('Add a trip', 'Enter a start point, destination and miles first.');
      return;
    }

    setSaving(true);

    try {
      await onAdd({
        startLabel: startLabel.trim(),
        endLabel: endLabel.trim(),
        miles: parsedMiles,
        purpose: purpose.trim() || 'Client run',
        classification,
      });

      setStartLabel('');
      setEndLabel('');
      setMiles('');
      setPurpose('');
      setClassification('Business');
      onClose();
    } catch (error) {
      Alert.alert('Trip not saved', error instanceof Error ? error.message : 'Try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.flex} variant="subheading">
          New trip
        </Text>
        <IconButton icon="close" label="Close trip form" onPress={onClose} />
      </View>
      <Field
        autoFocus
        label="From"
        onChangeText={setStartLabel}
        onSubmitEditing={() => endRef.current?.focus()}
        placeholder="Home"
        returnKeyType="next"
        submitBehavior="submit"
        value={startLabel}
      />
      <Field
        ref={endRef}
        label="To"
        onChangeText={setEndLabel}
        onSubmitEditing={() => milesRef.current?.focus()}
        placeholder="Client office"
        returnKeyType="next"
        submitBehavior="submit"
        value={endLabel}
      />
      <Field
        ref={milesRef}
        keyboardType="decimal-pad"
        label="Miles"
        onChangeText={setMiles}
        placeholder="12.4"
        value={miles}
      />
      <Field
        ref={purposeRef}
        hint="Optional"
        label="Purpose"
        onChangeText={setPurpose}
        onSubmitEditing={() => void handleSave()}
        placeholder="Client run"
        returnKeyType="done"
        value={purpose}
      />
      <Segmented onChange={setClassification} options={classifications} value={classification} />
      <Button label="Save" loading={saving} onPress={() => void handleSave()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
});
