import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import Constants from 'expo-constants';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen, Section, Text, Tile } from '@/components/ds';
import { radius, space } from '@/constants/theme';
import { appInfo } from '@/lib/app-info';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';

const faqs = [
  {
    title: 'Using more than one bank',
    body: 'Pick the bank each time you add money in or out. Home shows each bank on its own, and Money can filter to one.',
  },
  {
    title: 'Getting a statement',
    body: 'Home → tap the top card → Export the year. You get a PDF and a spreadsheet.',
  },
  {
    title: 'Currencies',
    body: 'Lancer works in any currency. Change yours in Account → Currency.',
  },
  {
    title: 'Free trial',
    body: '7 days free, then $3 a month.',
  },
];

/** One job: get help fast. */

export default function SupportScreen() {
  const { theme } = useAppTheme();
  const { activePlan, profile } = useLedger();
  const [open, setOpen] = useState<number | null>(null);

  const handleEmailSupport = async () => {
    const subject = 'Lancer support';
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
