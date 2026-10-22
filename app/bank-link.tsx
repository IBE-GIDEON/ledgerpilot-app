import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { ComponentProps, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';
import type { LinkExit, LinkSuccess } from 'react-native-plaid-link-sdk';

import { Button, Card, Field, List, Row, Screen, Text } from '@/components/ds';
import { space } from '@/constants/theme';
import { featureFlags } from '@/lib/config/env';
import { isExpoGo } from '@/lib/config/runtime';
import { banking, PlaidExchangeResponse } from '@/lib/supabase/banking';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';

// Plaid's native module is not in Expo Go, so only load it in a development or store build.
const plaid: typeof import('react-native-plaid-link-sdk') | null =
  isExpoGo || Platform.OS === 'web' ? null : require('react-native-plaid-link-sdk');

type ConnectionStep = 'picker' | 'linking' | 'success';
type IconName = ComponentProps<typeof Ionicons>['name'];
type Bank = { id: string; name: string; icon: IconName };

const POPULAR_BANKS: Bank[] = [
  { id: 'chase', name: 'Chase', icon: 'business-outline' },
  { id: 'bofa', name: 'Bank of America', icon: 'business-outline' },
  { id: 'wells', name: 'Wells Fargo', icon: 'business-outline' },
  { id: 'citi', name: 'Citi', icon: 'business-outline' },
  { id: 'amex', name: 'American Express', icon: 'card-outline' },
  { id: 'capone', name: 'Capital One', icon: 'card-outline' },
  { id: 'navy', name: 'Navy Federal', icon: 'business-outline' },
  { id: 'usaa', name: 'USAA', icon: 'business-outline' },
];

function plural(count: number, noun: string) {
  return `${count.toLocaleString('en-US')} ${noun}${count === 1 ? '' : 's'}`;
}

/** One job: pick a bank and link it read-only through Plaid. */
/** Bank sync is off for v1; deep links land on Home instead of a dead screen. */
export default function BankLinkScreenRoute() {
  if (!featureFlags.bankSync) {
    return <Redirect href="/dashboard" />;
  }

  return <BankLinkScreen />;
}

function BankLinkScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { actions } = useLedger();

  const [step, setStep] = useState<ConnectionStep>('picker');
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [syncSummary, setSyncSummary] = useState<PlaidExchangeResponse | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    async function initPlaid() {
      try {
        const token = await banking.createLinkToken();
        setLinkToken(token);
      } catch (error) {
        console.error('Failed to initialize Plaid link token:', error);
        Alert.alert(
          'Bank linking is not ready',
          error instanceof Error ? error.message : 'Lancer could not start bank linking right now.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    void initPlaid();
  }, []);

  const filteredBanks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? POPULAR_BANKS.filter((bank) => bank.name.toLowerCase().includes(needle)) : POPULAR_BANKS;
  }, [query]);

  const onPlaidSuccess = async (success: LinkSuccess) => {
    setStep('linking');

    try {
      const result = await banking.exchangePublicToken(success.publicToken, success.metadata);
      setSyncSummary(result);
      await actions.refreshData();
      setStep('success');
    } catch (error) {
      console.error('Plaid exchange failed:', error);
      Alert.alert(
        'Connection incomplete',
        error instanceof Error ? error.message : 'The account connected, but Lancer could not finish the import.'
      );
      setStep('picker');
    }
  };

  const onPlaidExit = (exit: LinkExit) => {
    if (exit.error) {
      console.error('Plaid exit error:', exit.error);
      Alert.alert('Connection interrupted', exit.error.displayMessage || 'Something went wrong while linking.');
    }

    setStep('picker');
  };

  const handleOpenPlaid = (bank?: Bank) => {
    if (Platform.OS === 'web') {
      Alert.alert('Mobile only', 'Bank linking works on iOS and Android.');
      return;
    }

    if (!plaid) {
      Alert.alert(
        'Installed app needed',
        'Bank linking is not available in Expo Go. Use a development build to link a bank.'
      );
      return;
    }

    if (!linkToken) {
      Alert.alert('Not ready yet', 'Bank linking is still starting. Try again in a moment.');
      return;
    }

    setSelectedBank(bank ?? null);
    plaid.create({ token: linkToken });
    plaid.open({
      onSuccess: onPlaidSuccess,
      onExit: onPlaidExit,
    });
  };

  if (step === 'linking') {
    return (
      <Screen header>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.tint} size="large" />
          <Text align="center" variant="heading">
            {`Linking ${selectedBank?.name ?? 'your bank'}`}
          </Text>
        </View>
      </Screen>
    );
  }

  if (step === 'success') {
    const institution = syncSummary?.institution_name ?? 'Your bank';
    const accountsImported = syncSummary?.accounts_imported ?? 0;
    const transactionsImported = syncSummary?.transactions_imported ?? 0;

    return (
      <Screen footer={<Button label="Done" onPress={() => router.replace('/dashboard')} />} header>
        <Card tone="primary">
          <Ionicons color={theme.positive} name="checkmark-circle" size={28} />
          <Text tone="inverse" variant="title">{`${institution} linked`}</Text>
          <Text tone="inverseMuted" variant="small">
            {`${plural(accountsImported, 'account')} · ${plural(transactionsImported, 'transaction')}${
              syncSummary?.product_ready ? '' : ' · more arriving soon'
            }`}
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          disabled={isLoading}
          label="Search all banks"
          loading={isLoading}
          onPress={() => handleOpenPlaid()}
        />
      }
      header
      keyboard>
      <Field
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        label="Find bank"
        onChangeText={setQuery}
        placeholder="Bank name"
        returnKeyType="search"
        value={query}
      />

      {filteredBanks.length > 0 ? (
        <List>
          {filteredBanks.map((bank) => (
            <Row
              key={bank.id}
              chevron
              icon={bank.icon}
              onPress={() => handleOpenPlaid(bank)}
              title={bank.name}
            />
          ))}
        </List>
      ) : (
        <Text variant="small" tone="muted">
          {`No match for “${query.trim()}”`}
        </Text>
      )}

      <Text align="center" tone="faint" variant="caption">
        Read-only via Plaid. Never moves money.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.xxl * 2,
  },
});
