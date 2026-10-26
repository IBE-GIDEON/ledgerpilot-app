import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Field, List, Row, Screen, Section, Text } from '@/components/ds';
import { space } from '@/constants/theme';
import { addAlertFromText } from '@/lib/alerts/inbox';
import { LancerAlerts } from '@/modules/lancer-alerts';

const iphoneSteps = [
  'Open Shortcuts → Automation → New Automation → Message.',
  'Sender: pick your bank’s name (GTBank, Kuda…). Choose Run Immediately.',
  'Add the action “URL Encode” and give it the Message.',
  'Add “Open URLs” with lancer://alert?text= followed by the encoded text.',
  'Repeat for each bank. Banks that email alerts work the same way with an Email automation.',
];

/** One job: switch on automatic bank alerts, or hand Lancer an alert by hand. */
export default function BankAlertsScreen() {
  const router = useRouter();
  const [granted, setGranted] = useState(false);
  const [batteryOk, setBatteryOk] = useState(true);
  const [pasted, setPasted] = useState('');
  const [reading, setReading] = useState(false);

  // Re-check when the person comes back from Android settings.
  useFocusEffect(
    useCallback(() => {
      if (LancerAlerts) {
        setGranted(LancerAlerts.isAccessGranted());
        setBatteryOk(LancerAlerts.isIgnoringBatteryOptimizations());
      }
    }, [])
  );

  const turnOn = () => {
    Alert.alert(
      'Let Lancer read bank alerts',
      'Lancer looks at notifications from your bank apps and bank text messages to spot money in and out. It keeps only the amount, bank, time and who it was to or from. Chat apps are ignored and nothing else is stored or sent anywhere.\n\nOn the next screen, find Lancer and switch it on.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Continue', onPress: () => LancerAlerts?.openAccessSettings() },
      ]
    );
  };

  const readPasted = async () => {
    setReading(true);
    try {
      const parsed = await addAlertFromText(pasted);
      if (parsed) {
        setPasted('');
        router.push('/alert-answer');
      } else {
        Alert.alert('Couldn’t read that', 'Paste the whole alert, including the amount and “credit” or “debit”.');
      }
    } finally {
      setReading(false);
    }
  };

  return (
    <Screen header>
      {Platform.OS === 'android' ? (
        LancerAlerts ? (
          <Section
            footnote="Works for bank apps like OPay, Kuda, PalmPay and Moniepoint, and for bank text messages. The bank app’s notifications must be on."
            title="Automatic">
            <List>
              <Row
                icon="notifications-outline"
                subtitle={granted ? 'Lancer asks about each alert as it arrives' : 'Off'}
                title="Read bank alerts"
                trailing={granted ? <Badge label="On" tone="positive" /> : <Badge label="Off" />}
              />
              {granted && !batteryOk ? (
                <Row
                  chevron
                  icon="battery-half-outline"
                  onPress={() => LancerAlerts?.openBatterySettings()}
                  subtitle="Find Lancer and choose “Don’t optimise”, so alerts aren’t missed"
                  title="Keep Lancer running"
                />
              ) : null}
            </List>
            {granted ? null : <Button label="Turn on" onPress={turnOn} />}
          </Section>
        ) : (
          <Card>
            <Text variant="subheading">Install Lancer to use this</Text>
            <Text tone="muted" variant="small">
              Automatic bank alerts work in the installed Lancer app, not in Expo Go.
            </Text>
          </Card>
        )
      ) : (
        <Section footnote="iPhones don’t let apps read texts or other apps’ notifications, so a Shortcut passes each bank text to Lancer." title="On iPhone">
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
});
