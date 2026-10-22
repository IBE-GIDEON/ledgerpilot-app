import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { Screen, Section, Text, Tile } from '@/components/ds';
import { radius, space } from '@/constants/theme';
import { appInfo } from '@/lib/app-info';
import { useAppTheme } from '@/providers/app-theme-provider';

const faqs = [
  {
    title: 'Connect a bank',
    body: 'Account → Connections. US banks only.',
  },
  {
    title: 'Outside the US',
    body: 'Everything works except bank sync.',
  },
  {
    title: 'Free trial',
    body: '7 days of full access. Then pick a plan.',
  },
];

export default function SupportScreen() {
  const { theme } = useAppTheme();
  const [open, setOpen] = useState<number | null>(null);

  const handleEmailSupport = async () => {
    const emailUrl = `mailto:${appInfo.supportEmail}?subject=Lancer%20Support`;
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
