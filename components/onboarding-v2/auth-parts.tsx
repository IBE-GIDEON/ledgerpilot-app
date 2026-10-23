import { StyleSheet, View } from 'react-native';

import { Divider, Text } from '@/components/ds';
import { space } from '@/constants/theme';

/** Centred title and optional one-line caption under the logo on auth screens. */
export function AuthIntro({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.intro}>
      <Text accessibilityRole="header" align="center" variant="title">
        {title}
      </Text>
      {subtitle ? (
        <Text align="center" tone="muted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** Message shown under a form when the server rejects it. Announced by screen readers. */
export function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <Text accessibilityLiveRegion="polite" accessibilityRole="alert" tone="negative" variant="small">
      {message}
    </Text>
  );
}

/** Hairline rule with a centred "or" label. */
export function OrDivider() {
  return (
    <View style={styles.or}>
      <View style={styles.orLine}>
        <Divider />
      </View>
      <Text tone="faint" variant="caption">
        or
      </Text>
      <View style={styles.orLine}>
        <Divider />
      </View>
    </View>
  );
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export function describeError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

const styles = StyleSheet.create({
  intro: {
    gap: space.xs,
  },
  or: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  orLine: {
    flex: 1,
  },
});
