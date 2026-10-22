import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const webStorage = {
  getItem(key: string) {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(key);
  },
  removeItem(key: string) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(key);
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(key, value);
  },
};

export const supabaseStorage = {
  async getItem(key: string) {
    if (Platform.OS === 'web') {
      return webStorage.getItem(key);
    }

    return AsyncStorage.getItem(key);
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      webStorage.removeItem(key);
      return;
    }

    await AsyncStorage.removeItem(key);
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      webStorage.setItem(key, value);
      return;
    }

    await AsyncStorage.setItem(key, value);
  },
};
