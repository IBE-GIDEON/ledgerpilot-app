import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button, Field } from '@/components/ds';
import { AuthShell } from '@/components/onboarding-v2/auth-shell';
import { AuthIntro, describeError, FormError, isValidEmail, OrDivider } from '@/components/onboarding-v2/auth-parts';
import { space } from '@/constants/theme';
import { useLedger } from '@/providers/ledger-provider';

type Errors = { email?: string; password?: string };

export default function LoginScreen() {
  const router = useRouter();
  const { auth, authBusy } = useLedger();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const showGoogleAuth = Platform.OS !== 'ios';
  const busy = submitting || authBusy;

  const validate = () => {
    const next: Errors = {};
    if (!email.trim()) {
      next.email = 'Enter your email address.';
    } else if (!isValidEmail(email)) {
      next.email = 'That email address doesn’t look right.';
    }
    if (!password) {
      next.password = 'Enter your password.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSignIn = async () => {
    setFormError(null);
    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);
      await auth.signInWithEmail(email, password);
      router.replace('/');
    } catch (error) {
      setFormError(describeError(error, 'We couldn’t sign you in right now. Try again in a moment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setFormError(null);
    try {
      setGoogleBusy(true);
      await auth.signInWithGoogle();
      router.replace('/');
    } catch (error) {
      setFormError(describeError(error, 'Google sign-in isn’t available right now.'));
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <AuthShell>
      <AuthIntro title="Welcome back" />

      <View style={styles.fields}>
        <Field
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          error={errors.email}
          keyboardType="email-address"
          label="Email"
          onChangeText={(value) => {
            setEmail(value);
            if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
          }}
          onSubmitEditing={() => passwordRef.current?.focus()}
          placeholder="you@example.com"
          returnKeyType="next"
          submitBehavior="submit"
          textContentType="emailAddress"
          value={email}
        />
        <Field
          ref={passwordRef}
          autoComplete="current-password"
          error={errors.password}
          label="Password"
          onChangeText={(value) => {
            setPassword(value);
            if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
          }}
          onSubmitEditing={() => void handleSignIn()}
          returnKeyType="done"
          secureTextEntry
          textContentType="password"
          value={password}
        />
        <Button
          fullWidth={false}
          label="Forgot password?"
          onPress={() => router.push('/forgot-password')}
          size="small"
          style={styles.forgot}
          variant="ghost"
        />
      </View>

      <View style={styles.actions}>
        <Button label="Sign in" loading={busy} onPress={() => void handleSignIn()} />
        <FormError message={formError} />

        {showGoogleAuth ? (
          <>
            <OrDivider />
            <Button
              disabled={busy}
              icon="logo-google"
              label="Continue with Google"
              loading={googleBusy}
              onPress={() => void handleGoogle()}
              variant="secondary"
            />
          </>
        ) : null}
      </View>

      <Button label="Create account" onPress={() => router.replace('/signup')} variant="ghost" />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: space.lg,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: -space.sm,
  },
  actions: {
    gap: space.md,
  },
});
