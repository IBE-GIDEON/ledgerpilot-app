import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button, Card, Field, List, Row, Screen, Section, Text } from '@/components/ds';
import { useLedger } from '@/providers/ledger-provider';

const removed = [
  { title: 'Profile and sign-in', icon: 'person-outline' },
  { title: 'Transactions and receipts', icon: 'receipt-outline' },
  { title: 'Mileage and taxes', icon: 'car-outline' },
  { title: 'Bank links', icon: 'link-outline' },
] as const;

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { auth, authBusy, usingLiveBackend } = useLedger();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmed = confirmation.trim().toUpperCase() === 'DELETE';
  const busy = deleting || authBusy;

  const handleDelete = async () => {
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    try {
      await auth.deleteAccount();
      router.replace('/welcome');
    } catch (error) {
      Alert.alert('Account not deleted', error instanceof Error ? error.message : 'We could not delete the account right now.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Screen
      header
      keyboard
      footer={
        <Button
          disabled={!confirmed}
          label="Delete"
          loading={busy}
          onPress={() => void handleDelete()}
          variant="destructive"
        />
      }>
      <Card tone="primary">
        <Text tone="inverse" variant="subheading">
          This can’t be undone
        </Text>
        <Text tone="inverseMuted" variant="small">
          {usingLiveBackend ? 'Your Lancer account is removed.' : 'Data on this phone is removed.'}
        </Text>
      </Card>

      <Section title="Removed">
        <List>
          {removed.map((item) => (
            <Row key={item.title} icon={item.icon} title={item.title} />
          ))}
        </List>
      </Section>

      <Text variant="caption" tone="faint">
        Cancel App Store or Google Play subscriptions there.
      </Text>

      <Field
        autoCapitalize="characters"
        autoCorrect={false}
        label="Type DELETE"
        onChangeText={setConfirmation}
        onSubmitEditing={() => void handleDelete()}
        placeholder="DELETE"
        returnKeyType="done"
        value={confirmation}
      />
    </Screen>
  );
}
