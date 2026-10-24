import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import Constants from 'expo-constants';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Card, Screen, Section, Text, Tile, useFeature } from '@/components/ds';
import { radius, space } from '@/constants/theme';
import { appInfo } from '@/lib/app-info';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';

const faqs = [
  {
    title: 'Recording a tax payment',
    body: 'Add it as an expense in the Taxes category. It counts as tax paid, not a business cost.',
  },
  {
    title: 'Sending my accountant everything',
    body: 'Taxes → Year-end packet sends a PDF and a spreadsheet. Included in Tax+.',
  },
  {
    title: 'Outside the US',
    body: 'Tracking works anywhere. Tax estimates and mileage rates follow US rules.',
  },
  {
    title: 'Free trial',
    body: '7 days of Pro. Then pick a plan.',
  },
];

/** One job: get help fast. Tax+ members are flagged for a faster reply. */

export default function SupportScreen() {
  const { theme } = useAppTheme();
  const { activePlan, profile } = useLedger();
  const priority = useFeature('prioritySupport');
  const [open, setOpen] = useState<number | null>(null);

  const handleEmailSupport = async () => {
    // Tax+ emails are tagged so they can be filtered and answered first.
    const subject = priority ? '[Priority] Lancer support · Tax+' : 'Lancer support';
    const body = [
      '',
      '',
      '—',
      `Plan: ${activePlan}`,
      `Name: ${profile.name || 'Not set'}`,
      `App: Lancer ${Constants.expoConfig?.version ?? ''} · ${Platform.OS} ${Platform.Version}`,
    ].join('\n');
    const emailUrl = `mailto:${appInfo.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    const supported = await Linking.canOpenURL(emailUrl);

    if (!supported) {
      Alert.alert('Email unavailable', `Please contact us at ${appInfo.supportEmail}.`);
      return;
    }

    await Linking.openURL(emailUrl);
  };

  return (
    <Screen header>
      {priority ? (
        <Card tone="primary">
          <View style={styles.priorityTitle}>
            <Ionicons color={theme.onHero} name="flash" size={16} />
            <Text tone="inverse" variant="subheading">
              Priority support
            </Text>
          </View>
          <Text tone="inverseMuted" variant="small">
            Included with Tax+. We reply within one business day.
          </Text>
        </Card>
      ) : null}

      <View style={styles.row}>
        <Tile caption={appInfo.supportEmail} icon="mail-outline" onPress={() => void handleEmailSupport()} title="Email us" />
      </View>

      <Section title="Questions">
        <View style={[styles.list, { backgroundColor: theme.surface }]}>
          {faqs.map((item, index) => {
            const expanded = open === index;
            return (
              <View
                key={item.title}
                style={index > 0 ? [styles.divided, { borderTopColor: theme.border }] : undefined}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  android_ripple={{ color: theme.surfaceMuted }}
                  onPress={() => setOpen(expanded ? null : index)}
                  style={({ pressed }) => [styles.question, pressed ? { backgroundColor: theme.surfaceMuted } : null]}>
                  <Text style={styles.questionText} variant="bodyMedium">
                    {item.title}
                  </Text>
                  <Ionicons color={theme.textFaint} name={expanded ? 'chevron-up' : 'chevron-down'} size={18} />
                </Pressable>
                {expanded ? (
                  <Text style={styles.answer} variant="small" tone="muted">
                    {item.body}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  priorityTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs + 2,
  },
  list: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  divided: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  question: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  questionText: {
    flex: 1,
  },
  answer: {
    paddingBottom: space.lg,
    paddingHorizontal: space.lg,
  },
});
