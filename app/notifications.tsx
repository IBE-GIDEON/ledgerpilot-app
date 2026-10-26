import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';

import { Badge, Button, EmptyState, List, Row, Screen, Section, SwitchRow } from '@/components/ds';
import { getReviewCounts } from '@/lib/summary';
import {
  loadReminderPrefs,
  PermissionState,
  readPermission,
  reminderLabels,
  ReminderKind,
  ReminderPrefs,
  requestPermission,
  saveReminderPrefs,
} from '@/lib/notifications/native';
import { useLedger } from '@/providers/ledger-provider';

type Upcoming = {
  id: string;
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  route: '/activity';
};

const kinds: ReminderKind[] = ['weeklyCheckIn'];
const kindIcons: Record<ReminderKind, ComponentProps<typeof Ionicons>['name']> = {
  weeklyCheckIn: 'checkmark-circle-outline',
};

/** One job: control which reminders Lancer sends, and see what's coming up. */
export default function NotificationsScreen() {
  const router = useRouter();
  const { receipts, transactions } = useLedger();
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [requesting, setRequesting] = useState(false);

  // Re-check when the screen returns from phone Settings.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      readPermission()
        .then((state) => active && setPermission(state))
        .catch(() => active && setPermission('unsupported'));
      return () => {
        active = false;
      };
    }, [])
  );

  useEffect(() => {
    void loadReminderPrefs().then(setPrefs);
  }, []);

  const toggle = (kind: ReminderKind, value: boolean) => {
    if (!prefs) {
      return;
    }
    const next = { ...prefs, [kind]: value };
    setPrefs(next);
    void saveReminderPrefs(next);
  };

  const turnOn = async () => {
    if (permission === 'blocked') {
      void Linking.openSettings();
      return;
    }

    setRequesting(true);
    try {
      const granted = await requestPermission();
      setPermission(granted ? 'granted' : await readPermission());
      if (!granted) {
        Alert.alert('Notifications are off', 'You can turn them on for Lancer in your phone settings.');
      }
    } catch {
      Alert.alert('Notifications unavailable', 'This device could not set up reminders right now.');
    } finally {
      setRequesting(false);
    }
  };

  const upcoming = useMemo<Upcoming[]>(() => {
    const list: Upcoming[] = [];

    const { transactionsToReview: uncategorized, receiptsToReview } = getReviewCounts(transactions, receipts);
    if (uncategorized + receiptsToReview > 0) {
      list.push({
        id: 'review',
        title: 'Needs a look',
        subtitle: [
          uncategorized > 0 ? `${uncategorized} uncategorized` : null,
          receiptsToReview > 0 ? `${receiptsToReview} receipts` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        icon: 'checkmark-circle-outline',
        route: '/activity',
      });
    }

    return list;
  }, [receipts, transactions]);

  const granted = permission === 'granted';

  return (
    <Screen header>
      <Section>
        <List>
          <Row
            icon="notifications-outline"
            subtitle={
              permission === 'blocked'
                ? 'Off in phone settings'
                : permission === 'unsupported'
                  ? 'Not available on this device'
                  : undefined
            }
            title="Notifications"
            trailing={
              permission === null ? null : granted ? (
                <Badge label="On" tone="positive" />
              ) : (
                <Badge label="Off" />
              )
            }
          />
        </List>
        {permission === 'undetermined' || permission === 'blocked' ? (
          <Button
            label={permission === 'blocked' ? 'Open settings' : 'Turn on'}
            loading={requesting}
            onPress={() => void turnOn()}
            variant="secondary"
          />
        ) : null}
      </Section>

      {prefs ? (
        <Section footnote={granted ? undefined : 'Your choices apply once notifications are on.'} title="Remind me about">
          <List>
            {kinds.map((kind) => (
              <SwitchRow
                key={kind}
                icon={kindIcons[kind]}
                onValueChange={(value) => toggle(kind, value)}
                subtitle={reminderLabels[kind].subtitle}
                title={reminderLabels[kind].title}
                value={prefs[kind]}
              />
            ))}
          </List>
        </Section>
      ) : null}

      <Section title="Coming up">
        {upcoming.length === 0 ? (
          <EmptyState body="Things that need a look show up here." icon="checkmark-done-outline" title="All clear" />
        ) : (
          <List>
            {upcoming.map((item) => (
              <Row
                key={item.id}
                chevron
                icon={item.icon}
                onPress={() => router.push(item.route)}
                subtitle={item.subtitle}
                title={item.title}
              />
            ))}
          </List>
        )}
      </Section>
    </Screen>
  );
}
