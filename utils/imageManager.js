import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const BASE_DIR = `${FileSystem.documentDirectory}item_photos/`;

/**
 * Ensures the items photo directory exists
 */
const ensureDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(BASE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true });
  }
};

/**
 * Sanitizes a URL to be safe for filenames
 */
const getFilename = (url) => {
  if (!url) return null;
  // Get the last part of the URL and remove non-alphanumeric chars
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1];
  return lastPart.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
};

export const imageManager = {
  /**
   * Resolves a remote URL to a local path.
   * If local doesn't exist, it initiates a download in the background.
   */
  getLocalUri: async (remoteUrl) => {
    if (!remoteUrl || Platform.OS === 'web') return remoteUrl;

    await ensureDir();
    const filename = getFilename(remoteUrl);
    const localUri = `${BASE_DIR}${filename}`;

    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (fileInfo.exists) {
      return localUri;
    }

    // Not exist locally → download it
    try {
      const downloadRes = await FileSystem.downloadAsync(remoteUrl, localUri);
      return downloadRes.uri;
    } catch (error) {
      console.warn('Image download failed:', error);
      return remoteUrl; // Fallback to remote if download fails
    }
  },

  /**
   * Saves a picked image (local temp URI) to permanent app storage
   */
  savePickedImage: async (tempUri) => {
    if (!tempUri || Platform.OS === 'web') return tempUri;

    await ensureDir();
    const filename = `picked_${Date.now()}.jpg`;
    const permanentUri = `${BASE_DIR}${filename}`;

    try {
      await FileSystem.copyAsync({
        from: tempUri,
        to: permanentUri,
      });
      return permanentUri;
    } catch (error) {
      console.warn('Failed to save picked image locally:', error);
      return tempUri;
    }
  },

  /**
   * Checks if an image is available locally
   */
  existsLocally: async (remoteUrl) => {
    if (!remoteUrl || Platform.OS === 'web') return false;
    const filename = getFilename(remoteUrl);
    const localUri = `${BASE_DIR}${filename}`;
    const info = await FileSystem.getInfoAsync(localUri);
    return info.exists;
  }
};
