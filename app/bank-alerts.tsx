import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Field, List, Row, Screen, Section, Text } from '@/components/ds';
import { space } from '@/constants/theme';
import { addAlertFromText, drainNativeAlerts } from '@/lib/alerts/inbox';
import { normalizeBank } from '@/lib/alerts/parse';
import { formatDayTime } from '@/lib/formatters';
import { readPermission, requestPermission } from '@/lib/notifications/native';
import { LancerAlerts } from '@/modules/lancer-alerts';

const iphoneSteps = [
  'Open Shortcuts → Automation → New Automation → Message.',
  'Sender: pick your bank’s name (GTBank, Kuda…). Choose Run Immediately.',
  'Add the action “URL Encode” and give it the Message.',
  'Add “Open URLs” with lancer://alert?text= followed by the encoded text.',
  'Repeat for each bank. Banks that email alerts work the same way with an Email automation.',
];

type Seen = { sender: string; text: string; at: number; kept: boolean };
type Diagnostics = { connectedAt: number; lastSeenAt: number; log: Seen[] };

function readDiagnostics(): Diagnostics | null {
  try {
    return LancerAlerts ? (JSON.parse(LancerAlerts.getDiagnostics()) as Diagnostics) : null;
  } catch {
    return null;
  }
}

/** One job: switch on automatic bank alerts, or hand Lancer an alert by hand. */
export default function BankAlertsScreen() {
  const router = useRouter();
  const [granted, setGranted] = useState(false);
  const [canNotify, setCanNotify] = useState(true);
  const [batteryOk, setBatteryOk] = useState(true);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [pasted, setPasted] = useState('');
  const [reading, setReading] = useState(false);

  const refresh = useCallback(() => {
    if (!LancerAlerts) {
      return;
    }
    setGranted(LancerAlerts.isAccessGranted());
    setBatteryOk(LancerAlerts.isIgnoringBatteryOptimizations());
    setDiagnostics(readDiagnostics());
    void readPermission().then((state) => setCanNotify(state === 'granted'));
  }, []);

  // Re-check when the person comes back from Android settings.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const turnOn = () => {
    Alert.alert(
      'Let Lancer read bank alerts',
      'Lancer looks at notifications from your bank apps and bank text messages to spot money in and out. It keeps only the amount, bank, time and who it was to or from. Chat apps are ignored and nothing else is stored or sent anywhere.\n\nOn the next screen, find Lancer and switch it on.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            // Lancer's own "What was this for?" pop-up needs notification permission too.
            void requestPermission().finally(() => LancerAlerts?.openAccessSettings());
          },
        },
      ]
    );
  };

  const allowNotifications = async () => {
    const ok = await requestPermission();
    if (!ok) {
      void Linking.openSettings();
    }
    refresh();
  };

  const reconnect = () => {
    LancerAlerts?.reconnect();
    void drainNativeAlerts();
    setTimeout(refresh, 1500);
  };

  // A skipped notification that was real money: put it through the normal must-answer question.
  const askAbout = async (item: Seen) => {
    const parsed = await addAlertFromText(item.text, item.sender, item.at);
    if (parsed) {
      router.push('/alert-answer');
      return;
    }
    Alert.alert('No amount found', 'Lancer couldn’t find an amount in that notification.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Add it myself', onPress: () => router.push('/transaction-create') },
    ]);
  };

  const readPasted = async () => {
    setReading(true);
    try {
      const parsed = await addAlertFromText(pasted);
      if (parsed) {
        setPasted('');
        router.push('/alert-answer');
      } else {
        Alert.alert('Couldn’t read that', 'Paste the whole alert, including the amount.');
      }
    } finally {
      setReading(false);
    }
  };

  const listening = Boolean(diagnostics?.connectedAt);

  return (
    <Screen header>
      {Platform.OS === 'android' ? (
        LancerAlerts ? (
          <>
            <Section
              footnote="Works for bank apps like OPay, Kuda, PalmPay and Moniepoint, and for bank text messages. The bank app’s notifications must be on."
              title="Automatic">
              <List>
                <Row
                  icon="notifications-outline"
                  subtitle={granted ? (listening ? 'Listening for bank alerts' : 'On, but not started yet') : 'Off'}
                  title="Read bank alerts"
                  trailing={granted ? <Badge label="On" tone="positive" /> : <Badge label="Off" />}
                />
                {granted && !canNotify ? (
                  <Row
                    chevron
                    icon="alert-circle-outline"
                    iconTone="accent"
                    onPress={() => void allowNotifications()}
                    subtitle="Needed for the “What was this for?” pop-up"
                    title="Allow Lancer notifications"
                  />
                ) : null}
                {granted && !batteryOk ? (
                  <Row
                    chevron
                    icon="battery-half-outline"
                    onPress={() => LancerAlerts?.openBatterySettings()}
                    subtitle="Find Lancer and choose “Don’t optimise”, so alerts aren’t missed"
                    title="Keep Lancer running"
                  />
                ) : null}
                {granted && !listening ? (
                  <Row chevron icon="refresh-outline" onPress={reconnect} title="Start listening" />
                ) : null}
              </List>
              {granted ? null : <Button label="Turn on" onPress={turnOn} />}
            </Section>

            {granted ? (
              <Section
                footnote="Notifications with an amount in them, newest first. Only kept on this phone."
                title="What Lancer saw">
                {diagnostics && diagnostics.log.length > 0 ? (
                  <View style={styles.seen}>
                    {[...diagnostics.log].reverse().map((item) => (
                      <Card key={`${item.at}-${item.sender}`}>
                        <View style={styles.seenTop}>
                          <Text numberOfLines={1} style={styles.stepText} variant="bodyMedium">
                            {`${normalizeBank(item.sender)} · ${formatDayTime(new Date(item.at).toISOString())}`}
                          </Text>
                          <Badge label={item.kept ? 'Asked' : 'Skipped'} tone={item.kept ? 'positive' : undefined} />
                        </View>
                        <Text tone="muted" variant="small">
                          {item.text}
                        </Text>
                        {item.kept ? null : (
                          <Button
                            fullWidth={false}
                            label="Ask me about this"
                            onPress={() => void askAbout(item)}
                            size="small"
                            variant="secondary"
                          />
                        )}
                      </Card>
                    ))}
                  </View>
                ) : (
                  <Card tone="muted">
                    <Text tone="muted" variant="small">
                      {diagnostics?.lastSeenAt
                        ? `No money alerts yet. Last notification of any kind: ${formatDayTime(new Date(diagnostics.lastSeenAt).toISOString())}.`
                        : 'Nothing has reached Lancer yet. Tap Start listening, or switch access off and on again.'}
                    </Text>
                  </Card>
                )}
              </Section>
            ) : null}
          </>
        ) : (
          <Card>
            <Text variant="subheading">Install Lancer to use this</Text>
            <Text tone="muted" variant="small">
              Automatic bank alerts work in the installed Lancer app, not in Expo Go.
            </Text>
          </Card>
        )
      ) : (
        <Section
          footnote="iPhones don’t let apps read texts or other apps’ notifications, so a Shortcut passes each bank text to Lancer."
          title="On iPhone">
          <Card>
            {iphoneSteps.map((step, index) => (
              <View key={step} style={styles.step}>
                <Text tone="muted" variant="smallMedium">
                  {`${index + 1}.`}
                </Text>
                <Text style={styles.stepText} variant="small">
                  {step}
                </Text>
              </View>
            ))}
          </Card>
        </Section>
      )}

      <Section footnote="Copy a bank text or notification and paste it here." title="Paste an alert">
        <Field
          label="Alert"
          multiline
          onChangeText={setPasted}
          placeholder="Acct: 01**89 Amt: NGN5,000.00 DR Desc: …"
          style={styles.paste}
          textAlignVertical="top"
          value={pasted}
        />
        <Button
          disabled={!pasted.trim()}
          label="Read alert"
          loading={reading}
          onPress={() => void readPasted()}
          variant="secondary"
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: {
    flexDirection: 'row',
    gap: space.sm,
  },
  stepText: {
    flex: 1,
  },
  paste: {
    minHeight: 96,
  },
  seen: {
    gap: space.sm,
  },
  seenTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
});
