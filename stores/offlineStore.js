import { storage } from '../utils/storage';

const OFFLINE_QUEUE_KEY = 'hisab_offline_queue';

/**
 * Offline-first store.
 * Queues API requests when offline and replays them on reconnect.
 */
export const offlineStore = {
  /**
   * Add a request to the offline queue.
   * @param {{ method: string, url: string, data: object }} request
   */
  enqueue: async (request) => {
    try {
      const queue = await offlineStore.getQueue();
      queue.push({
        ...request,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        createdAt: new Date().toISOString(),
      });
      await storage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Offline enqueue error:', error);
    }
  },

  /**
   * Get all queued requests.
   */
  getQueue: async () => {
    try {
      const raw = await storage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('Offline getQueue error:', error);
      return [];
    }
  },

  /**
   * Remove a request from the queue after successful sync.
   */
  dequeue: async (requestId) => {
    try {
      const queue = await offlineStore.getQueue();
      const updated = queue.filter((r) => r.id !== requestId);
      await storage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Offline dequeue error:', error);
    }
  },

  /**
   * Clear the entire queue.
   */
  clearQueue: async () => {
    try {
      await storage.deleteItem(OFFLINE_QUEUE_KEY);
    } catch (error) {
      console.error('Offline clearQueue error:', error);
    }
  },

  /**
   * Get count of pending offline requests.
   */
  getPendingCount: async () => {
    const queue = await offlineStore.getQueue();
    return queue.length;
  },
};
