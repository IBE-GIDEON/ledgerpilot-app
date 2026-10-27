import { StyleSheet, Text as RNText, TextProps } from 'react-native';

import { tabularNums, type as typeScale } from '@/constants/theme';
import { useDisplayCurrency } from '@/lib/currency-context';
import { formatCurrency } from '@/lib/formatters';
import { useAppTheme } from '@/providers/app-theme-provider';

type Variant = keyof typeof typeScale;
type Tone = 'default' | 'muted' | 'faint' | 'primary' | 'accent' | 'positive' | 'negative' | 'inverse' | 'inverseMuted';

type AppTextProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', tone = 'default', align, style, ...rest }: AppTextProps) {
  const { theme } = useAppTheme();

  const color = {
    default: theme.text,
    muted: theme.textMuted,
    faint: theme.textFaint,
    primary: theme.tint,
    accent: theme.accent,
    positive: theme.positive,
    negative: theme.negative,
    inverse: theme.onHero,
    inverseMuted: theme.onHeroMuted,
  }[tone];

  return (
    <RNText
      maxFontSizeMultiplier={1.6}
      style={[typeScale[variant], { color, textAlign: align }, style]}
      {...rest}
    />
  );
}

/** Small uppercase label above a group or value. */
export function Overline({ children, tone = 'muted', ...rest }: AppTextProps) {
  return (
    <Text variant="caption" tone={tone} style={styles.overline} {...rest}>
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Text>
  );
}

type AmountProps = Omit<AppTextProps, 'children'> & {
  value: number;
  /** Colour by sign: green for money in, red for money out. */
  signed?: boolean;
  /** Show cents. Defaults to true below 10,000. */
  cents?: boolean;
  size?: 'display' | 'title' | 'heading' | 'bodyMedium' | 'smallMedium';
};

/** Money in serif with tabular digits; shrinks instead of overflowing. */
export function Amount({ value, signed = false, cents, size = 'heading', tone, style, ...rest }: AmountProps) {
  useDisplayCurrency();
  const showCents = cents ?? Math.abs(value) < 10000;
  const formatted = formatCurrency(Math.abs(value), showCents ? 2 : 0);
  const prefix = signed ? (value > 0 ? '+' : value < 0 ? '−' : '') : value < 0 ? '−' : '';
  const resolvedTone: Tone = tone ?? (signed ? (value >= 0 ? 'positive' : 'negative') : 'default');

  return (
    <Text
      adjustsFontSizeToFit
      minimumFontScale={0.6}
      numberOfLines={1}
      variant={size}
      tone={resolvedTone}
      style={[tabularNums, style]}
      {...rest}>
      {prefix}
      {formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  overline: {
    letterSpacing: 0.8,
  },
});
