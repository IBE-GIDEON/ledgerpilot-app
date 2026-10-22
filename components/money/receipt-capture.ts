import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { ReceiptCaptureAsset } from '@/lib/supabase/receipts';

export type CaptureSource = 'camera' | 'library';

/**
 * Asks for permission and opens the camera or photo library.
 * Returns null when the person cancels or declines; shows an Alert on failure.
 */
export async function pickReceiptImage(source: CaptureSource): Promise<ReceiptCaptureAsset | null> {
  try {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert(
        'Permission needed',
        source === 'camera'
          ? 'Allow camera access so you can photograph receipts in Lancer.'
          : 'Allow photo access so you can add receipt images from your library.',
      );
      return null;
    }

    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 0.8 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    const asset = result.canceled ? null : result.assets?.[0];

    if (!asset?.uri) {
      return null;
    }

    return { fileName: asset.fileName, mimeType: asset.mimeType, uri: asset.uri };
  } catch (error) {
    Alert.alert(
      'Could not open the photo',
      error instanceof Error ? error.message : 'Try again, or enter the receipt by hand.',
    );
    return null;
  }
}

/**
 * Camera / library / manual choice. iOS gets a native action sheet; Android's alert
 * holds at most three buttons, so cancel there is a tap outside or the back button.
 */
export function chooseCaptureSource(onChoose: (source: CaptureSource | 'manual') => void, title = 'Add receipt') {
  if (Platform.OS === 'ios') {
    const choices = ['camera', 'library', 'manual'] as const;
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: ['Take photo', 'Choose from library', 'Enter manually', 'Cancel'], cancelButtonIndex: 3 },
      (index) => {
        const choice = choices[index];
        if (choice) {
          onChoose(choice);
        }
      },
    );
    return;
  }

  Alert.alert(
    title,
    'Photograph a receipt, pick one from your photos, or type the details.',
    [
      { text: 'Enter manually', onPress: () => onChoose('manual') },
      { text: 'Library', onPress: () => onChoose('library') },
      { text: 'Camera', onPress: () => onChoose('camera') },
    ],
    { cancelable: true },
  );
}

/** Camera or library only, for attaching a photo to something already being entered. */
export function choosePhotoSource(onChoose: (source: CaptureSource) => void, title = 'Attach receipt') {
  if (Platform.OS === 'ios') {
    const choices = ['camera', 'library'] as const;
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: ['Take photo', 'Choose from library', 'Cancel'], cancelButtonIndex: 2 },
      (index) => {
        const choice = choices[index];
        if (choice) {
          onChoose(choice);
        }
      },
    );
    return;
  }

  Alert.alert(
    title,
    undefined,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Library', onPress: () => onChoose('library') },
      { text: 'Camera', onPress: () => onChoose('camera') },
    ],
    { cancelable: true },
  );
}
