import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button, Field, Screen } from '@/components/ds';
import { AuthIntro, describeError, FormError, isValidEmail, OrDivider } from '@/components/onboarding-v2/auth-parts';
import { space } from '@/constants/theme';
import { useLedger } from '@/providers/ledger-provider';

const MIN_PASSWORD = 6;

type Errors = { email?: string; password?: string; confirmPassword?: string };

export default function SignupScreen() {
  const router = useRouter();
  const { auth, authBusy } = useLedger();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const showGoogleAuth = Platform.OS !== 'ios';
  const busy = submitting || authBusy;

  const clearError = (key: keyof Errors) => {
    if (errors[key]) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const validate = () => {
    const next: Errors = {};
    if (!email.trim()) {
      next.email = 'Enter your email address.';
    } else if (!isValidEmail(email)) {
      next.email = 'That email address doesn’t look right.';
    }
    if (!password) {
      next.password = 'Choose a password.';
    } else if (password.length < MIN_PASSWORD) {
      next.password = `Use at least ${MIN_PASSWORD} characters.`;
    }
    if (password && confirmPassword !== password) {
      next.confirmPassword = 'The passwords don’t match.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreateAccount = async () => {
    setFormError(null);
    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);
      const result = await auth.signUpWithEmail({ email, name, password });

      if (result === 'confirm-email') {
        Alert.alert(
          'Check your email',
          'Your account is created. Open the email we sent, confirm your address, then sign in.'
        );
        router.replace('/login');
        return;
      }

      router.replace('/');
    } catch (error) {
      setFormError(describeError(error, 'We couldn’t create your account right now. Try again in a moment.'));
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
    <Screen header keyboard>
      <AuthIntro photo subtitle="No card needed." title="Create account" />

      <View style={styles.fields}>
        <Field
          autoCapitalize="words"
          autoComplete="name"
          label="Name"
          onChangeText={setName}
          onSubmitEditing={() => emailRef.current?.focus()}
          placeholder="Your name"
          returnKeyType="next"
          submitBehavior="submit"
          textContentType="name"
          value={name}
        />
        <Field
          ref={emailRef}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          error={errors.email}
          keyboardType="email-address"
          label="Email"
          onChangeText={(value) => {
            setEmail(value);
            clearError('email');
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
          autoComplete="new-password"
          error={errors.password}
          hint={`${MIN_PASSWORD}+ characters`}
          label="Password"
          onChangeText={(value) => {
            setPassword(value);
            clearError('password');
          }}
          onSubmitEditing={() => confirmRef.current?.focus()}
          returnKeyType="next"
          secureTextEntry
          submitBehavior="submit"
          textContentType="newPassword"
          value={password}
        />
        <Field
          ref={confirmRef}
          autoComplete="new-password"
          error={errors.confirmPassword}
          label="Confirm password"
          onChangeText={(value) => {
            setConfirmPassword(value);
            clearError('confirmPassword');
          }}
          onSubmitEditing={() => void handleCreateAccount()}
          returnKeyType="done"
          secureTextEntry
          textContentType="newPassword"
          value={confirmPassword}
        />
      </View>

      <View style={styles.actions}>
        <Button label="Create account" loading={busy} onPress={() => void handleCreateAccount()} />
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

      <Button label="Sign in" onPress={() => router.replace('/login')} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: space.lg,
  },
  actions: {
    gap: space.md,
  },
});
