import axios from 'axios';
import { storage } from '../utils/storage';
import { Platform } from 'react-native';

import Constants from 'expo-constants';

/**
 * API Base URL — adapts per platform:
 *  - Web browser:      localhost:5000
 *  - Mobile (Dev):     Auto-detects host machine LAN IP (via Expo Constants)
 *  - Mobile (Prod):    Production URL
 */
const getBaseUrl = () => {
  if (!__DEV__) return 'https://your-production-api.com/api';

  if (Platform.OS === 'web') return 'http://localhost:5000/api';

  // For physical devices and emulators, we use the IP of the machine running the Expo server
  const debuggerHost = Constants.expoConfig?.hostUri;
  const localhost = debuggerHost?.split(':')[0] || 'localhost';

  return `http://${localhost}:5000/api`;
};

const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: Attach JWT ─────────────────────────
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Could not read auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle auth errors ────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid → clear all stored auth data
      try {
        await storage.deleteItem('auth_token');
        await storage.deleteItem('auth_user');
      } catch (e) {
        // Ignore storage errors
      }
      // Notify the app to redirect to login (avoids circular import of router here)
      if (typeof window !== 'undefined' && window.dispatchEvent && typeof Event !== 'undefined') {
        window.dispatchEvent(new Event('auth:logout'));
      }
    }
    return Promise.reject(error);
  }
);

// ─── API Helpers ─────────────────────────────────────────────

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  customerLogin: (data) => api.post('/auth/customer-login', data),
};

// Items
export const itemsAPI = {
  list: (params) => api.get('/items', { params }),
  get: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
};

// Customers
export const customersAPI = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  balance: (id) => api.get(`/customers/${id}/balance`),
  create: (data) => api.post('/customers', data),
  import: (contacts) => api.post('/customers/import', { contacts }),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// Transactions
export const transactionsAPI = {
  create: (data) => api.post('/transactions', data),
  list: (params) => api.get('/transactions', { params }),
  dashboard: () => api.get('/transactions/dashboard'),
  smartPrice: (customerId, itemId) =>
    api.get(`/transactions/smart-price/${customerId}/${itemId}`),
};

// Customer Portal
export const portalAPI = {
  balance: () => api.get('/portal/balance'),
  history: (params) => api.get('/portal/history', { params }),
};

// Upload
export const uploadAPI = {
  image: async (uri) => {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image`;

    formData.append('image', { uri, name: filename, type });

    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;
