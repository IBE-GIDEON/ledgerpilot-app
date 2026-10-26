import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ds/button';
import { Card } from '@/components/ds/surfaces';
import { Text } from '@/components/ds/text';
import { space } from '@/constants/theme';
import { Feature, featureCopy, planIncludes } from '@/lib/billing/features';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';

/** True when the current plan (and trial state) unlocks the feature. */
export function useFeature(feature: Feature) {
  const { access, activePlan } = useLedger();
  return !access.isBlocked && planIncludes(activePlan, feature);
}

/** Renders children when unlocked; otherwise a quiet card that opens the plan screen. */
export function ProGate({ feature, children }: PropsWithChildren<{ feature: Feature }>) {
  const unlocked = useFeature(feature);
  const router = useRouter();
  const { theme } = useAppTheme();

  if (unlocked) {
    return <>{children}</>;
  }

  const copy = featureCopy[feature];

  return (
    <Card>
      <View style={styles.row}>
        <Ionicons color={theme.accent} name="lock-closed-outline" size={16} />
        <Text variant="caption" tone="accent">
          {'NEEDS A PLAN'}
        </Text>
      </View>
      <Text variant="subheading">{copy.title}</Text>
      <Text variant="small" tone="muted">
        {copy.body}
      </Text>
      <Button
        fullWidth={false}
        label="See plan"
        onPress={() => router.push('/upgrade')}
        size="small"
        variant="secondary"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs + 2,
  },
});
