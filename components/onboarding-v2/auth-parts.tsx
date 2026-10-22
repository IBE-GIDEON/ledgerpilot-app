import { StyleSheet, View } from 'react-native';

import { Divider, Photo, Text } from '@/components/ds';
import { photos } from '@/constants/images';
import { space } from '@/constants/theme';

/** Bold title and optional one-line caption at the top of auth forms (the native header has no title). */
export function AuthIntro({ title, subtitle, photo = false }: { title: string; subtitle?: string; photo?: boolean }) {
  return (
    <View style={styles.intro}>
      {photo ? (
        <Photo
          accessibilityLabel={photos.auth.alt}
          aspectRatio={2.6}
          focus={photos.auth.focus}
          source={photos.auth.source}
          style={styles.photo}
        />
      ) : null}
      <Text accessibilityRole="header" variant="title">
        {title}
      </Text>
      {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
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
  photo: {
    marginBottom: space.md,
  },
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
