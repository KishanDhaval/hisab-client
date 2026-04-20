import { Platform } from 'react-native';

/**
 * Cross-platform secure storage.
 * - Native (iOS/Android): uses expo-secure-store
 * - Web: uses localStorage (SecureStore is not available on web)
 */

let SecureStore = null;

if (Platform.OS !== 'web') {
  SecureStore = require('expo-secure-store');
}

export const storage = {
  getItem: async (key) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  setItem: async (key, value) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },

  deleteItem: async (key) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};
