import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Field, Text } from '@/components/ds';
import { AuthShell } from '@/components/onboarding-v2/auth-shell';
import { AuthIntro, describeError, FormError, isValidEmail } from '@/components/onboarding-v2/auth-parts';
import { space } from '@/constants/theme';
import { useLedger } from '@/providers/ledger-provider';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { auth, authBusy } = useLedger();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const busy = submitting || authBusy;

  const handleSendLink = async () => {
    setFormError(null);

    if (!email.trim()) {
      setEmailError('Enter the email you signed up with.');
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError('That email address doesn’t look right.');
      return;
    }

    try {
      setSubmitting(true);
      await auth.sendPasswordResetEmail(email);
      setSentTo(email.trim());
    } catch (error) {
      setFormError(describeError(error, 'We couldn’t send a reset link right now. Try again in a moment.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <AuthShell>
        <AuthIntro title="Check your inbox" />
        <Card>
          <Text variant="small" tone="muted">
            Link sent to
          </Text>
          <Text numberOfLines={1} variant="subheading">
            {sentTo}
          </Text>
        </Card>
        <View style={styles.actions}>
          <Button label="Sign in" onPress={() => router.back()} />
          <Button label="Change email" onPress={() => setSentTo(null)} variant="ghost" />
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthIntro subtitle="We’ll email you a link." title="Reset password" />

      <Field
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        error={emailError}
        keyboardType="email-address"
        label="Email"
        onChangeText={(value) => {
          setEmail(value);
          setEmailError(undefined);
        }}
        onSubmitEditing={() => void handleSendLink()}
        placeholder="you@example.com"
        returnKeyType="send"
        textContentType="emailAddress"
        value={email}
      />

      <View style={styles.actions}>
        <Button label="Send link" loading={busy} onPress={() => void handleSendLink()} />
        <FormError message={formError} />
        <Button label="Sign in" onPress={() => router.back()} variant="ghost" />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: space.md,
  },
});
