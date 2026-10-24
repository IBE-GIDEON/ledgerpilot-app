import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/account/avatar';
import { Button, Field, Screen, Section, Text } from '@/components/ds';
import { space } from '@/constants/theme';
import { useLedger } from '@/providers/ledger-provider';

type Errors = Partial<Record<'name' | 'role' | 'homeState', string>>;

export default function ProfileEditScreen() {
  const router = useRouter();
  const { actions, profile } = useLedger();

  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState(profile.role);
  const [homeState, setHomeState] = useState(profile.homeState);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Photo access needed', 'Allow photo access in Settings to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    setUpdatingPhoto(true);
    try {
      await actions.updateAvatar(result.assets[0].uri);
    } catch (error) {
      Alert.alert(
        'Photo not updated',
        error instanceof Error ? error.message : 'Unable to update your profile photo right now.'
      );
    } finally {
      setUpdatingPhoto(false);
    }
  };

  const handleSave = async () => {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Add your name.';
    if (!role.trim()) next.role = 'Add what you do.';
    if (!homeState.trim()) next.homeState = 'Add your state.';
    setErrors(next);

    if (Object.keys(next).length > 0) {
      return;
    }

    setSaving(true);
    try {
      await actions.updateProfile({
        homeState: homeState.trim(),
        name: name.trim(),
        role: role.trim(),
      });
      router.back();
    } catch (error) {
      Alert.alert('Profile not saved', error instanceof Error ? error.message : 'Unable to save your profile right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      header
      footer={<Button label="Save" loading={saving} onPress={() => void handleSave()} />}>
      <View style={styles.photo}>
        <Avatar name={name || profile.name} size={72} uri={profile.avatarUrl} />
        <View style={styles.photoText}>
          <Text numberOfLines={1} variant="heading">
            {name || profile.name || 'Your profile'}
          </Text>
          <Button
            fullWidth={false}
            icon="image-outline"
            label="Change"
            loading={updatingPhoto}
            onPress={() => void handlePickImage()}
            size="small"
            variant="secondary"
          />
        </View>
      </View>

      <Section>
        <Field
          autoCapitalize="words"
          autoComplete="name"
          error={errors.name}
          label="Name"
          onChangeText={setName}
          placeholder="Your name"
          returnKeyType="next"
          textContentType="name"
          value={name}
        />
        <Field
          autoCapitalize="words"
          error={errors.role}
          label="Role"
          onChangeText={setRole}
          placeholder="Designer"
          returnKeyType="next"
          value={role}
        />
        <Field
          autoCapitalize="words"
          error={errors.homeState}
          label="Home state"
          onChangeText={setHomeState}
          placeholder="e.g. California"
          returnKeyType="done"
          value={homeState}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.lg,
  },
  photoText: {
    flex: 1,
    gap: space.sm,
    minWidth: 0,
  },
});
