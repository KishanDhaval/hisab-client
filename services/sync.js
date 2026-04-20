import { Platform } from 'react-native';
import api from './api';
import { offlineStore } from '../stores/offlineStore';

let isSyncing = false;
let NetInfo = null;

// NetInfo doesn't work on web — conditionally import
if (Platform.OS !== 'web') {
  try {
    NetInfo = require('@react-native-community/netinfo').default;
  } catch (e) {
    // Not available
  }
}

/**
 * Sync service — replays queued offline requests when connection restores.
 */
export const syncService = {
  /**
   * Start listening for network changes.
   * Call once at app startup (e.g., in root layout).
   * Returns unsubscribe function, or noop on web.
   */
  startListening: () => {
    if (!NetInfo) {
      // On web, we use online/offline events instead
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.addEventListener) {
        const handler = () => syncService.syncPendingRequests();
        window.addEventListener('online', handler);
        return () => window.removeEventListener('online', handler);
      }
      return () => {}; // noop
    }

    return NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        syncService.syncPendingRequests();
      }
    });
  },

  /**
   * Replay all queued requests sequentially.
   */
  syncPendingRequests: async () => {
    if (isSyncing) return;
    isSyncing = true;

    try {
      const queue = await offlineStore.getQueue();
      if (queue.length === 0) {
        isSyncing = false;
        return;
      }

      console.log(`Syncing ${queue.length} offline requests...`);

      for (const request of queue) {
        try {
          await api({
            method: request.method,
            url: request.url,
            data: request.data,
          });
          await offlineStore.dequeue(request.id);
          console.log(`Synced: ${request.method} ${request.url}`);
        } catch (error) {
          console.warn(`Sync failed for ${request.url}:`, error.message);
          // If it's a 4xx error, remove from queue (bad data, won't retry)
          if (error.response?.status >= 400 && error.response?.status < 500) {
            await offlineStore.dequeue(request.id);
          }
          // 5xx or network errors: leave in queue for next retry
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      isSyncing = false;
    }
  },

  /**
   * Wrap an API call with offline fallback.
   * If network is unavailable, queue the request.
   * @param {{ method: string, url: string, data?: object }} request
   * @returns {Promise<any>}
   */
  executeWithOfflineFallback: async (request) => {
    // On web, check navigator.onLine
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await offlineStore.enqueue(request);
        return {
          data: { message: 'Saved offline. Will sync when connected.', offline: true },
        };
      }
      return api(request);
    }

    // On native, use NetInfo
    if (NetInfo) {
      const netState = await NetInfo.fetch();
      if (netState.isConnected && netState.isInternetReachable) {
        return api(request);
      }
      await offlineStore.enqueue(request);
      return {
        data: { message: 'Saved offline. Will sync when connected.', offline: true },
      };
    }

    // Fallback: just try the request
    return api(request);
  },
};
