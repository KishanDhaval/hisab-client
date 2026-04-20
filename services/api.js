import axios from 'axios';
import { storage } from '../utils/storage';
import { Platform } from 'react-native';

/**
 * API Base URL — adapts per platform:
 *  - Web browser:      localhost:5000
 *  - Android emulator: 10.0.2.2:5000  (emulator's alias for host machine)
 *  - iOS simulator:    localhost:5000
 *  - Physical device:  Replace with your machine's LAN IP (e.g. 192.168.x.x:5000)
 */
const getBaseUrl = () => {
  if (!__DEV__) return 'https://your-production-api.com/api';

  if (Platform.OS === 'web') return 'http://localhost:5000/api';
  if (Platform.OS === 'android') return 'http://10.0.2.2:5000/api';
  return 'http://localhost:5000/api'; // iOS simulator
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
      if (typeof window !== 'undefined') {
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

export default api;
