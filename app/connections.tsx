import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, StyleSheet, View } from 'react-native';

import { Amount, Button, Card, EmptyState, List, ProGate, Row, Screen, Section, Text, useFeature } from '@/components/ds';
import { space } from '@/constants/theme';
import { featureFlags } from '@/lib/config/env';
import { formatFullDate } from '@/lib/formatters';
import { banking, LinkedBankAccount, LinkedBankConnection } from '@/lib/supabase/banking';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';

function accountMeta(account: LinkedBankAccount) {
  return [account.subtype || account.type, account.mask ? `•••• ${account.mask}` : null].filter(Boolean).join(' · ');
}

function connectionStatus(connection: LinkedBankConnection) {
  if (connection.product_ready && connection.last_synced_at) {
    return `Synced ${formatFullDate(connection.last_synced_at)}`;
  }

  return connection.product_ready ? 'Not synced yet' : 'Syncing';
}

/** One job: see which banks are linked, and link another. Pull down to sync. */
/** Bank sync is off for v1; deep links land on Home instead of a dead screen. */
export default function ConnectionsScreenRoute() {
  if (!featureFlags.bankSync) {
    return <Redirect href="/dashboard" />;
  }

  return <ConnectionsScreen />;
}

function ConnectionsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { actions, usingLiveBackend } = useLedger();
  const unlocked = useFeature('bankSync');

  const [connections, setConnections] = useState<LinkedBankConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadConnections = useCallback(async () => {
    // Preview mode has no account to read banks from; show the empty state instead of an error.
    if (!usingLiveBackend || !unlocked) {
      setConnections([]);
      setIsLoading(false);
      return;
    }

    try {
      const nextConnections = await banking.listConnections();
      setConnections(nextConnections);
    } catch (error) {
      console.error('Unable to load linked connections:', error);
      Alert.alert(
        'Connections did not load',
        error instanceof Error ? error.message : 'Lancer could not load your linked banks right now.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [unlocked, usingLiveBackend]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadConnections();
    }, [loadConnections])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      const result = await banking.refreshTransactions();
      setConnections(result.connections);
      await actions.refreshData();

      Alert.alert(
        'Bank sync complete',
        result.transactions_imported > 0
          ? `${result.transactions_imported} transaction${
              result.transactions_imported === 1 ? '' : 's'
            } imported.`
          : 'Your linked accounts were checked. Some banks may still be preparing transaction history.'
      );
    } catch (error) {
      console.error('Unable to refresh bank sync:', error);
      Alert.alert(
        'Refresh failed',
        error instanceof Error ? error.message : 'Lancer could not refresh bank activity right now.'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const canRefresh = unlocked && connections.length > 0;

  return (
    <Screen
      header
      footer={unlocked ? <Button icon="add" label="Link bank" onPress={() => router.push('/bank-link')} /> : undefined}
      refreshControl={
        canRefresh ? (
          <RefreshControl
            onRefresh={() => void handleRefresh()}
            refreshing={isRefreshing}
            tintColor={theme.textMuted}
          />
        ) : undefined
      }>
      <ProGate feature="bankSync">
        {isLoading ? (
          <Card>
            <View style={styles.loading}>
              <ActivityIndicator color={theme.textMuted} size="small" />
              <Text variant="small" tone="muted">
                Loading
              </Text>
            </View>
          </Card>
        ) : connections.length === 0 ? (
          <Card>
            <EmptyState body="Import transactions automatically." icon="link-outline" title="No banks linked" />
          </Card>
        ) : (
          connections.map((connection) => (
            <Section
              key={connection.id}
              footnote={connectionStatus(connection)}
              title={connection.institution_name ?? 'Bank'}>
              <List>
                {connection.accounts.length > 0 ? (
                  connection.accounts.map((account) => {
                    const balance = account.available_balance ?? account.current_balance;
                    return (
                      <Row
                        key={account.id}
                        icon="card-outline"
                        subtitle={accountMeta(account) || undefined}
                        title={account.official_name || account.name}
                        trailing={
                          balance != null ? (
                            <Amount size="bodyMedium" value={balance} />
                          ) : (
                            <Text variant="small" tone="muted">
                              Pending
                            </Text>
                          )
                        }
                      />
                    );
                  })
                ) : (
                  <Row icon="time-outline" title="Preparing accounts" />
                )}
              </List>
            </Section>
          ))
        )}

        <Text align="center" tone="faint" variant="caption">
          {canRefresh ? 'Read-only. Pull down to sync.' : 'Read-only. Never moves money.'}
        </Text>
      </ProGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
});
