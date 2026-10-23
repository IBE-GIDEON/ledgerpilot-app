import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGutter } from '@/components/ds';
import { space } from '@/constants/theme';

/** Room for the transparent native back button above the logo. */
const HEADER_ROOM = 52;
const LOGO_SIZE = 64;

/**
 * Shared frame for sign in, create account and reset password: a short white-to-black fade
 * from the landing page with the logo centred on the white, then the form on black.
 */
export function AuthShell({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const gutter = useGutter();

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={['#FFFFFF', '#F1F1F2', '#2A2A2D', '#0B0B0C']}
        locations={[0, 0.16, 0.36, 0.52]}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + HEADER_ROOM,
              paddingBottom: insets.bottom + space.xl,
              paddingHorizontal: gutter,
            },
          ]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.logoWrap}>
            <Image accessibilityLabel="Lancer" source={require('@/assets/images/logo.png')} style={styles.logo} />
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#0B0B0C',
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: space.xl,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: space.xl,
  },
  logo: {
    height: LOGO_SIZE,
    width: LOGO_SIZE,
  },
});
