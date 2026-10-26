import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text, useGutter } from '@/components/ds';
import { radius, space } from '@/constants/theme';
import { markRemindersOffered, requestPermission } from '@/lib/notifications/native';
import { useAppTheme } from '@/providers/app-theme-provider';

/** One job: explain reminders, then ask the phone for permission once. Shown right after setup. */
export default function RemindersIntroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const gutter = useGutter();
  const { theme } = useAppTheme();
  const [asking, setAsking] = useState(false);

  const finish = async (turnOn: boolean) => {
    setAsking(true);
    try {
      await markRemindersOffered();
      if (turnOn) {
        await requestPermission();
      }
    } finally {
      setAsking(false);
      router.replace('/dashboard');
    }
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.background,
          paddingHorizontal: gutter,
          paddingTop: insets.top + space.xxl,
          paddingBottom: insets.bottom + space.lg,
        },
      ]}>
      <View style={styles.body}>
        <View style={[styles.icon, { backgroundColor: theme.surface }]}>
          <Ionicons color={theme.text} name="notifications-outline" size={34} />
        </View>
        <Text accessibilityRole="header" align="center" variant="title">
          A nudge when it matters
        </Text>
        <Text align="center" tone="muted">
          On Sundays, only if a transaction or receipt needs a look. Nothing else.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="Turn on reminders" loading={asking} onPress={() => void finish(true)} />
        <Button disabled={asking} label="Not now" onPress={() => void finish(false)} variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
  },
  body: {
    alignItems: 'center',
    flex: 1,
    gap: space.md,
    justifyContent: 'center',
    maxWidth: 360,
    alignSelf: 'center',
  },
  icon: {
    alignItems: 'center',
    borderRadius: radius.card,
    height: 80,
    justifyContent: 'center',
    marginBottom: space.md,
    width: 80,
  },
  actions: {
    gap: space.sm,
  },
});
