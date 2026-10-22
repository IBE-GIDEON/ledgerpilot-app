import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Text } from '@/components/ds';
import { space, tabularNums } from '@/constants/theme';
import { useAppTheme } from '@/providers/app-theme-provider';
import { PlanTier } from '@/types/ledger';

const MAX_FEATURES = 4;

type PlanCardProps = {
  tier: PlanTier;
  price: string;
  period: string;
  /** Kept for callers; the card no longer prints it. */
  summary?: string;
  features: string[];
  isCurrent: boolean;
  recommended?: boolean;
  /** The one primary action on the sheet. Other plans use secondary buttons. */
  emphasis?: boolean;
  buttonLabel: string;
  loading?: boolean;
  disabled?: boolean;
  onChoose: () => void;
};

export function PlanCard({
  tier,
  price,
  period,
  features,
  isCurrent,
  recommended = false,
  emphasis = false,
  buttonLabel,
  loading = false,
  disabled = false,
  onChoose,
}: PlanCardProps) {
  const { theme } = useAppTheme();
  const hero = recommended;

  return (
    <Card tone={hero ? 'primary' : 'surface'}>
      <View style={styles.top}>
        <Text numberOfLines={1} style={styles.flex} tone={hero ? 'inverse' : 'default'} variant="heading">
          {tier}
        </Text>
        {isCurrent ? <Badge label="Current" tone="positive" /> : recommended ? <Badge label="Popular" /> : null}
      </View>

      <View style={styles.price}>
        <Text numberOfLines={1} tone={hero ? 'inverse' : 'default'} variant="title" style={tabularNums}>
          {price}
        </Text>
        <Text numberOfLines={1} variant="small" tone={hero ? 'inverseMuted' : 'muted'}>
          {period}
        </Text>
      </View>

      <View style={styles.features}>
        {features.slice(0, MAX_FEATURES).map((feature) => (
          <View key={feature} style={styles.feature}>
            <Ionicons color={theme.positive} name="checkmark" size={16} style={styles.check} />
            <Text numberOfLines={1} style={styles.flex} tone={hero ? 'inverse' : 'default'} variant="small">
              {feature}
            </Text>
          </View>
        ))}
      </View>

      <Button
        disabled={isCurrent || disabled}
        label={buttonLabel}
        loading={loading}
        onPress={onChoose}
        variant={isCurrent ? 'secondary' : emphasis ? 'primary' : 'secondary'}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  price: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: space.xs,
  },
  features: {
    gap: space.sm,
  },
  feature: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: space.sm,
  },
  check: {
    marginTop: 1,
  },
  flex: {
    flex: 1,
  },
});
